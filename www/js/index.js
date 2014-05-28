/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener("offline", onOffline, false);
        document.addEventListener("online", onOnline, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        //getImages();
        onDeviceReady();
    },

    isOnline:false
};

function onOnline() {
    // Handle the online event
    isOnline = true;
}

function onOffline() {
    // Handle the offline event
    isOnline = false;
}

//getImages();
function getImages() {
    var url = "https://www.fbml.be/api/api.php?callback=?";
    console.log("images");

    $.ajax({
        type: "GET",
        url: url,
        contentType: "application/x-www-form-urlencoded; charset=utf-8",
        dataType: "jsonp",
        crossDomain: true,
        cache: false,
        success: function (data) {
           
            var div = document.createElement("div");
            $(div).addClass("row");
            $("#imageContainer").append(div);

            $.each(data, function (index, item) {
                var imgUrl = "https://www.fbml.be/api/img/" + item; // image url
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
                    var imagePath = fs.root.fullPath + "/" + item; // full file path
                    var fileTransfer = new FileTransfer();
                    fileTransfer.download(imgUrl, imagePath, function (entry) {
                        console.log(entry.fullPath); // entry is fileEntry object
                        $(div).append('<div class="col-md-4"><img class="img-responsive" src="img/' + entry.fullPath + '" /></div>');
                        if (!((index + 1) % 3)) {
                            div = document.createElement("div");
                            $(div).addClass("row");
                            $("#imageContainer").append(div);
                        }
                    }, function (error) {
                        console.log("download error source " + error.source);
                        console.log("download error target " + error.target);
                        console.log("upload error code" + error.code);
                    });
                })
            });
        },
        error: function (e) {
            alert('Error: ' + e.responseText);
        }
    });
}



//Global instance of DirectoryEntry for our data
var DATADIR;
var knownfiles = [];    

//Loaded my file system, now let's get a directory entry for where I'll store my crap    
function onFSSuccess(fileSystem) {
    fileSystem.root.getDirectory("Android/data/com.trinch.offline",{create:true},gotDir,onError);
}

//The directory entry callback
function gotDir(d){
    console.log("got dir");
    console.log(JSON.stringify(d));
    DATADIR = d;
    var reader = DATADIR.createReader();
    reader.readEntries(function(d){
        gotFiles(d);
    },onError);
}

//Result of reading my directory
function gotFiles(entries) {
        for (var i = 0; i < server_files.length; i++) {

            var foundLocal = false;

            for (var j = 0; j < entries.length; j++) {
                if (entries[j].name === server_files[i]) {
                    foundLocal = true;
                    renderPicture(entries[j].nativeURL);
                }
            }

            if (!foundLocal) {
                console.log("need to download " + server_files[i]);
                var ft = new FileTransfer();
                var dlPath = DATADIR.nativeURL + "/" + server_files[i];
                console.log("downloading image to " + dlPath);
                ft.download("http://www.fbml.be/api/img/" + escape(server_files[i]), dlPath, function (e) {
                    renderPicture(e.nativeURL);
                    console.log("Successful download of " + e.nativeURL);
                }, onError);
            }
        }
}

function renderPicture(path){
    $("#photos").append('<div class="col-md-4 col-xs-4"><img class="img-responsive img-thumbnail" src="' + path + '" /></div>');
    console.log("<img src='"+path+"'>");
}

function onError(e){
    console.log("ERROR");
    console.log(JSON.stringify(e));
}

function onDeviceReady() {
    //what do we have in cache already?
    var networkState = navigator.connection.type;
    if (networkState != Connection.NONE) {
        app.isOnline = true;
    }
    appReady();
}

var server_files = [];
var db_name = "db_offline";
var db_version = "1.0";
var db_display_name = "Offline DB";

function appReady() {

    if (app.isOnline) {
        //$("#status").html("Ready to check remote files...");
        $.get("https://www.fbml.be/api/api.php?callback=?", {}, function (res) {

            console.log(JSON.stringify(res));
            server_files = res;

            var db = window.openDatabase(db_name, db_version, db_display_name, 1000000);
            db.transaction(populateDB, errorCB, successCB);

            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFSSuccess, null);

        }, "json");
    } else {
        var db = window.openDatabase(db_name, db_version, db_display_name, 1000000);
        db.transaction(getImagesFromDB, errorCB);
    }
}

function getImagesFromDB(tx) {
    tx.executeSql('SELECT * FROM tbl_images', [], querySuccess, errorCB);
}

function querySuccess(tx, results) {
    var len = results.rows.length;
    for (var i = 0; i < len; i++) {
        server_files.push(results.rows.item(i).name);
    }
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFSSuccess, null);
}

function populateDB(tx) {

    tx.executeSql('DROP TABLE IF EXISTS tbl_images');
    tx.executeSql('CREATE TABLE IF NOT EXISTS tbl_images (id unique, name)');

    $.each(server_files, function (index, item) {
        tx.executeSql('INSERT INTO tbl_images (id, name) VALUES (' + index + ', "' + item + '")');
    });
}

function errorCB(err) {
    alert("Error processing SQL: " + JSON.stringify(err));
}

function successCB() {
    console.log("success!");
}

function isTableExists(tx, tableName, callback) {
    tx.executeSql('SELECT * FROM ' + tableName, [], function (tx, resultSet) {
        if (resultSet.rows.length <= 0) {
            callback(false);
        } else {
            callback(true);
        }
    }, function (err) {
        callback(false);
    })
};