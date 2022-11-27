class Room {
    constructor(domain, game_id, sessionid, name, max, current, password, userid, socket, extra) {
        this.domain = domain;
        this.game_id = game_id;
        this.sessionid = sessionid;
        this.name = name;
        this.max = max;
        this.current = current;
        this.password = password.trim();
        this.hasPassword = !!this.password;
        this.id = domain + ':' + game_id + ':' + sessionid;
        this.owner = {
            userid,
            socket,
            extra
        }
        this.users = [this.owner];
    }
    checkPassword(password) {
        return password.trim() === this.password;
    }
    addUser(user) {
        this.users.forEach(userr => {
            user.socket.emit('user-connected', userr.userid);
        })
        this.users.push(user);
        this.current++;
    }
}


module.exports =  Room;
