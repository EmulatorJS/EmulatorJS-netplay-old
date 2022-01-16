const express = require('express');
const http = require('http');
const cors = require('cors');
const {app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { networkInterfaces } = require('os');

let window;
var servers = []
global.data = {}
global.users = {}
global.userData = {}
global.passwords = {}

app.on('second-instance', function(e, cmd, dir) {
    if ('undefined' != typeof window) {
        window.show();
    }
})

app.on('ready', function() {
    createWindow();
})

function getIPs() {
    let ifaces = networkInterfaces();
    var ips = [ ]
    for (var k in ifaces) {
        for (var i=0; i<ifaces[k].length; i++) {
            if (ifaces[k][i].family == 'IPv4') {
                ips.push(ifaces[k][i].address)
            }
        }
    }
    return ips
}

function createWindow() {
    window = new BrowserWindow({
        backgroundColor: '#ffffff',
        width: 420,
        minWidth: 280,
        height: 700,
        minHeight: 200,
        frame: true,
        title: "emuserver",
        webPreferences: {
            scrollBounce: false,
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: true,
            preload: path.join(__dirname, "preload.js")
        }
    });
    window.loadFile('index.html');
}

ipcMain.handle('getUrls', function(e) {
    return getIPs();
})

ipcMain.on('start', function(e) {
    terminateServers()
    makeServer(3000)
})

ipcMain.on('stop', function(e) {
    terminateServers()
})

function terminateServers() {
    global.data = {}
    global.users = {}
    global.userData = {}
    global.passwords = {}
    for (var i=0; i<servers.length; i++) {
        servers[i].destroy()
    }
    servers = []
}

function makeServer(port) {
    const app = express();
    const server = http.createServer(app);
    const io = require("socket.io")(server);
    app.use(cors())
    app.get('/list', function(req, res) {
        var args = transformArgs(req.url)
        if (! args.game_id || ! args.domain) {
            res.end('{}')
            return
        }
        if (! global.data[args.domain]) {
            global.data[args.domain] = {}
        }
        if (! global.data[args.domain][args.game_id]) {
            global.data[args.domain][args.game_id] = {}
        }
        res.end(JSON.stringify(global.data[args.domain][args.game_id]))
    })
    io.on('connection', (socket) => {
        var url = socket.handshake.url
        var args = transformArgs(url)
        var room = ''
        var data = {}
        var waitingOnConfirmation = false;
        var roomOwner = false
        var extraData = JSON.parse(args.extra)
        function disconnect() {
            io.to(room).emit('user-disconnected', args.userid)
            var newArray = []
            for (var i=0; i<global.users[extraData.domain][extraData.game_id][args.sessionid].length; i++) {
                if (global.users[extraData.domain][extraData.game_id][args.sessionid][i] !== args.userid) {
                    newArray.push(global.users[extraData.domain][extraData.game_id][args.sessionid][i])
                }
            }
            delete global.userData[extraData.domain][extraData.game_id][args.sessionid][args.userid]
            if (roomOwner) {
                for (var k in global.userData[extraData.domain][extraData.game_id][args.sessionid]) {
                    if (k !== args.userid) {
                        global.userData[extraData.domain][extraData.game_id][args.sessionid][k].socket.emit('set-isInitiator-true', args.sessionid)
                    }
                    break;
                }
            }
            global.users[extraData.domain][extraData.game_id][args.sessionid] = newArray
            global.data[extraData.domain][extraData.game_id][args.sessionid].current = global.users[extraData.domain][extraData.game_id][args.sessionid].length
            if (global.data[extraData.domain][extraData.game_id][args.sessionid].current === 0) {
                delete global.data[extraData.domain][extraData.game_id][args.sessionid];
            }
            roomOwner = false
            socket.leave(room)
            room = ''
        }
        socket.on('disconnect', () => {
            disconnect()
        });
        socket.on('close-entire-session', function(cb) {
            io.to(room).emit('closed-entire-session', args.sessionid, extraData)
            if (typeof cb == 'function') {
                cb(true)
            }
        })
        socket.on('open-room', function(data, cb) {
            if (! global.data[data.extra.domain]) {
                global.data[data.extra.domain] = {}
            }
            if (! global.data[data.extra.domain][data.extra.game_id]) {
                global.data[data.extra.domain][data.extra.game_id] = {}
            }
            if (! global.users[data.extra.domain]) {
                global.users[data.extra.domain] = {}
            }
            if (! global.users[data.extra.domain][data.extra.game_id]) {
                global.users[data.extra.domain][data.extra.game_id] = {}
            }
            if (! global.users[data.extra.domain][data.extra.game_id][args.sessionid]) {
                global.users[data.extra.domain][data.extra.game_id][args.sessionid] = []
            }
            if (! global.userData[data.extra.domain]) {
                global.userData[data.extra.domain] = {}
            }
            if (! global.userData[data.extra.domain][data.extra.game_id]) {
                global.userData[data.extra.domain][data.extra.game_id] = {}
            }
            if (! global.userData[data.extra.domain][data.extra.game_id][args.sessionid]) {
                global.userData[data.extra.domain][data.extra.game_id][args.sessionid] = {}
            }
            if (! global.passwords[data.extra.domain]) {
                global.passwords[data.extra.domain] = {}
            }
            if (! global.passwords[data.extra.domain][data.extra.game_id]) {
                global.passwords[data.extra.domain][data.extra.game_id] = {}
            }
            global.data[data.extra.domain][data.extra.game_id][args.sessionid] = {
                owner_name: data.extra.name,
                room_name: data.extra.room_name,
                country: 'US',
                max: parseInt(args.maxParticipantsAllowed) || 2,
                current: 1,
                password: (data.password === '' ? 0 : 1)
            }
            global.passwords[data.extra.domain][data.extra.game_id][args.sessionid] = (data.password === '' ? null : data.password);
            socket.emit('extra-data-updated', null, global.data[data.extra.domain][data.extra.game_id][args.sessionid])
            
            socket.emit('extra-data-updated', args.userid, global.data[data.extra.domain][data.extra.game_id][args.sessionid])
            
            global.userData[data.extra.domain][data.extra.game_id][args.sessionid][args.userid] = {
                "socket": socket,
                "extra": data.extra
            }
            global.users[data.extra.domain][data.extra.game_id][args.sessionid].push(args.userid)
            room = data.extra.domain+':'+data.extra.game_id+':'+args.sessionid
            socket.join(room)
            roomOwner = true
            cb(true, undefined)
        })
        socket.on('check-presence', function(roomid, cb) {
            if (global.data[data.extra.domain][data.extra.game_id][roomid]) {
                cb(true, roomid, null)
                return
            }
            cb(false, roomid, null)
            return
        })
        socket.on('join-room', function(data, cb) {
            if (global.passwords[data.extra.domain][data.extra.game_id][args.sessionid]) {
                var password = global.passwords[data.extra.domain][data.extra.game_id][args.sessionid]
                if (password !== data.password) {
                    cb(false, 'INVALID_PASSWORD')
                    return
                }
            }
            if (! global.users[data.extra.domain][data.extra.game_id][args.sessionid]) {
                cb(false, 'USERID_NOT_AVAILABLE')
                return
            }
            if (global.data[data.extra.domain][data.extra.game_id][args.sessionid].current >= global.data[data.extra.domain][data.extra.game_id][args.sessionid].max) {
                cb(false, 'ROOM_FULL')
                return
            }
            room = data.extra.domain+':'+data.extra.game_id+':'+data.sessionid
            
            for (var i=0; i< global.users[data.extra.domain][data.extra.game_id][args.sessionid].length; i++) {
                socket.to(room).emit('netplay', {
                    "remoteUserId": global.users[data.extra.domain][data.extra.game_id][args.sessionid][i],
                    "message": {
                        "newParticipationRequest": true,
                        "isOneWay": false,
                        "isDataOnly": true,
                        "localPeerSdpConstraints": {
                            "OfferToReceiveAudio": false,
                            "OfferToReceiveVideo": false
                        },
                        "remotePeerSdpConstraints": {
                            "OfferToReceiveAudio": false,
                            "OfferToReceiveVideo": false
                        }
                    },
                    "sender": args.userid,
                    "extra": extraData
                })
            }
            
            global.userData[data.extra.domain][data.extra.game_id][args.sessionid][args.userid] = {
                "socket": socket,
                "extra": data.extra
            }
            global.data[data.extra.domain][data.extra.game_id][data.sessionid].current++
            
            socket.to(room).emit('user-connected', args.userid)
            socket.join(room)
            
            for (var i=0; i<global.users[data.extra.domain][data.extra.game_id][args.sessionid].length; i++) {
                socket.emit('user-connected', global.users[data.extra.domain][data.extra.game_id][args.sessionid][i])
            }
            global.users[data.extra.domain][data.extra.game_id][args.sessionid].push(args.userid)
            roomOwner = false
            cb(true, null)
        })
        socket.on('set-password', function(password, cb) {
            if (password && password !== '') {
                global.passwords[data.extra.domain][data.extra.game_id][args.sessionid] = password;
                global.data[data.extra.domain][data.extra.game_id][args.sessionid].password = 1;
            }
            if (typeof cb == 'function') {
                cb(true)
            }
        });
        socket.on('changed-uuid', function(newUid, cb) {
            var a = global.users[extraData.domain][extraData.game_id][args.sessionid]
            if (a.includes(args.userid)) {
                for (var i=0; i<a.length; i++) {
                    if (global.users[extraData.domain][extraData.game_id][args.sessionid][i] === args.userid) {
                        global.users[extraData.domain][extraData.game_id][args.sessionid][i] = newUid
                        break;
                    }
                }
            }
            args.userid = newUid
        });
        socket.on('disconnect-with', function(userid, cb) {
            for (var k in global.userData[extraData.domain][extraData.game_id][args.sessionid]) {
                if (k === userid) {
                    global.userData[extraData.domain][extraData.game_id][args.sessionid][k].socket.emit('closed-entire-session', args.sessionid, extraData)
                    disconnect()
                }
            }
            if (typeof cb == 'function') {
                cb(true)
            }
        })
        socket.on('netplay', function(msg) {
            if (msg && msg.message && msg.message.userLeft === true) {
                disconnect()
            }
            var outMsg = JSON.parse(JSON.stringify(msg))
            outMsg.extra = extraData
            socket.to(room).emit('netplay', outMsg)
        })
        socket.on('extra-data-updated', function(msg) {
            var outMsg = JSON.parse(JSON.stringify(msg))
            outMsg.country = 'US'
            extraData = outMsg
            if (global.userData[extraData.domain] && global.userData[extraData.domain][extraData.game_id] && global.userData[extraData.domain][extraData.game_id][args.sessionid] && global.userData[extraData.domain][extraData.game_id][args.sessionid][args.userid]) {
                global.userData[extraData.domain][extraData.game_id][args.sessionid][args.userid].extra = extraData
            } else if (args.userid) {
                if (! global.userData[extraData.domain]) {
                    global.userData[extraData.domain] = {}
                }
                if (! global.userData[extraData.domain][extraData.game_id]) {
                    global.userData[extraData.domain][extraData.game_id] = {}
                }
                if (! global.userData[extraData.domain][extraData.game_id][args.sessionid]) {
                    global.userData[extraData.domain][extraData.game_id][args.sessionid] = {}
                }
                global.userData[extraData.domain][extraData.game_id][args.sessionid][args.userid] = {
                    "socket": socket,
                    "extra": extraData
                }
            }
            
            io.to(room).emit('extra-data-updated', args.userid, outMsg)
        })
        socket.on('get-remote-user-extra-data', function(id) {
            socket.emit('extra-data-updated', global.userData[extraData.domain][extraData.game_id][args.sessionid][id].extra)
        })
    });
    server.listen(port || 3000, () => {
        console.log('listening on *:'+(port || 3000));
    });
    var connections = {}
    server.on('connection', function(e) {
        var k = e.remoteAddress + ':' + e.remotePort;
        connections[k] = e;
        e.on('close', function() {
            delete connections[k];
        });
    });
    server.destroy = function(cb) {
        server.close(cb);
        for (var k in connections) {
            connections[k].destroy();
        }
    };
    servers.push(server)
}

function transformArgs(url) {
    var args = {}
    var idx = url.indexOf('?')
    if (idx != -1) {
        var s = url.slice(idx+1)
        var parts = s.split('&')
        for (var i=0; i<parts.length; i++) {
            var p = parts[i]
            var idx2 = p.indexOf('=')
            args[decodeURIComponent(p.slice(0,idx2))] = decodeURIComponent(p.slice(idx2+1,s.length))
        }
    }
    return args
}