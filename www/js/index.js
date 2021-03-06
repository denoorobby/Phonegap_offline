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
        document.addEventListener('deviceready', onDeviceReady, false);
        document.addEventListener("offline", onOffline, false);
        document.addEventListener("online", onOnline, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    isOnline:false
};

$("#btnRefresh").click(syncImages);

function onOnline() {
    // Handle the online event
    isOnline = true;
}

function onOffline() {
    // Handle the offline event
    isOnline = false;
}

//Global instance of DirectoryEntry for our data
var DATADIR;
var knownfiles = [];    

//Loaded my file system, now let's get a directory entry for where I'll store my crap    
function onFSSuccess(fileSystem) {
    alert("success filesystem");
    if (device.platform == "iOS") {
        fileSystem.root.getDirectory("www", { create: true }, gotDir, onError);
    } else {
        fileSystem.root.getDirectory("Android/data/com.trinch.offline", { create: true }, gotDir, onError);
    }   
}

//The directory entry callback
function gotDir(d){
    alert("Got dir!");
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
                    renderPicture(entries[j].toURL().replace(/\\/g, ''));
                }
            }

            if (!foundLocal) {
                console.log("need to download " + server_files[i]);
                var ft = new FileTransfer();
                var dlPath = DATADIR.toURL().replace(/\\/g, '') + "/" + server_files[i];
                console.log("downloading image to " + dlPath);
                ft.download("https://www.fbml.be/api/img/" + escape(server_files[i]), dlPath, function (e) {
                    renderPicture(e.toURL().replace(/\\/g, ''));
                    console.log("Successful download of " + e.toURL().replace(/\\/g, ''));
                }, onError);
            }
        }
}

function renderPicture(path){
    $("#photos").append('<div class="col-md-4 col-xs-4"><img class="img-responsive img-thumbnail" src="' + path + '" /></div>');
}

function onError(e){
    alert(JSON.stringify(e));
}

var server_files = [];
var db_name = "db_offline";
var db_version = "1.0";
var db_display_name = "Offline DB";

    function onDeviceReady() {

        var networkState = navigator.connection.type;
        if (networkState != Connection.NONE) {
            app.isOnline = true;
        }

        syncImages();
    }

    function syncImages() {
        if (app.isOnline) {
            $.get("https://www.fbml.be/api/api.php?callback=?", {}, function (res) {

                alert("got server images");

                server_files = res;

                var db = window.openDatabase(db_name, db_version, db_display_name, 1000000);
                db.transaction(populateDB, errorCB, successCB);
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
        alert("Error processing SQL: " + err.code);
    }

    function successCB() {
        alert("success!");
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFSSuccess, null);
    }