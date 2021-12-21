const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const cors = require('cors');
const io = require("socket.io")(server);
const atob = require("atob");
const Blob = require('node-blob');
const FileSystem = require("./FileSystem.js");

global.data = {}
global.extra = {}
global.users = {}
global.sockets = {}

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
    var extraData = JSON.parse(args.extra)
    console.log('a user connected');
    if (! global.sockets[extraData.domain]) {
        global.sockets[extraData.domain] = {}
    }
    if (! global.sockets[extraData.domain][extraData.game_id]) {
        global.sockets[extraData.domain][extraData.game_id] = []
    }
    global.sockets[extraData.domain][extraData.game_id][args.userid] = socket
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
    socket.on('open-room', function(data, cb) {
        if (! global.data[data.extra.domain]) {
            global.data[data.extra.domain] = {}
        }
        if (! global.data[data.extra.domain][data.extra.game_id]) {
            global.data[data.extra.domain][data.extra.game_id] = {}
        }
        if (! global.extra[data.extra.domain]) {
            global.extra[data.extra.domain] = {}
        }
        if (! global.extra[data.extra.domain][data.extra.game_id]) {
            global.extra[data.extra.domain][data.extra.game_id] = {}
        }
        if (! global.users[data.extra.domain]) {
            global.users[data.extra.domain] = {}
        }
        if (! global.users[data.extra.domain][data.extra.game_id]) {
            global.users[data.extra.domain][data.extra.game_id] = []
        }
        global.data[data.extra.domain][data.extra.game_id][args.sessionid] = {
            owner_name: data.extra.name,
            room_name: data.extra.room_name,
            country: 'US',
            max: args.maxParticipantsAllowed || 2,
            current: 1,
            password: (data.password === '' ? 0 : 1)
        }
        global.users[data.extra.domain][data.extra.game_id].push(args.userid)
        socket.emit('extra-data-updated', args.userid, global.data[data.extra.domain][data.extra.game_id][args.sessionid])
        socket.join(data.extra.domain+':'+data.extra.game_id+':'+args.sessionid)
        room = data.extra.domain+':'+data.extra.game_id+':'+args.sessionid
        cb(true, true)
    })
    socket.on('join-room', function(data, cb) {
        socket.to(data.extra.domain+':'+data.extra.game_id+':'+data.sessionid).emit('netplay', {
            "remoteUserId": args.userid,
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
            "sender": global.users[data.extra.domain][data.extra.game_id][0]
        })
        
        socket.join(data.extra.domain+':'+data.extra.game_id+':'+data.sessionid)
        global.data[data.extra.domain][data.extra.game_id][data.sessionid].current++
        
        room = data.extra.domain+':'+data.extra.game_id+':'+data.sessionid
        socket.to(room).emit('user-connected', args.userid)
        global.users[data.extra.domain][data.extra.game_id].push(args.userid)
        
        socket.emit('user-connected', global.users[data.extra.domain][data.extra.game_id][0])
        cb(true, true)
    })
    socket.on('netplay', function(msg) {
        socket.to(room).emit('netplay', msg)
    })
    socket.on('extra-data-updated', function(msg) {
        extraData = msg
        var outMsg = JSON.parse(JSON.stringify(msg))
        outMsg.country = 'US'
        io.to(room).emit('extra-data-updated', args.userid, outMsg)
    })
});


server.listen(3000, () => {
    console.log('listening on *:3000');
});

function transformArgs(url) {
    var arguments = {}
    var idx = url.indexOf('?')
    if (idx != -1) {
        var s = url.slice(idx+1)
        var parts = s.split('&')
        for (var i=0; i<parts.length; i++) {
            var p = parts[i]
            var idx2 = p.indexOf('=')
            arguments[decodeURIComponent(p.slice(0,idx2))] = decodeURIComponent(p.slice(idx2+1,s.length))
        }
    }
    return arguments
}
