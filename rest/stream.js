
import { w3cwebsocket as W3CWebSocket } from "websocket";

import EventEmitter from 'events';


class stream extends EventEmitter {
    constructor(address, options) {
        super();
        this.address = address;
        this.options = options;
        this.socket = undefined;
    }
    openStream() {
        return new Promise((_, reject) => {
            if (this.socket !== undefined) {
                return reject('there is already a stream, please close it first.' + this.socket);
            };

            this.socket = new W3CWebSocket(this.address);
            let self = this;
            this.socket.onopen = () => {
                console.log('WebSocket Client Connected');
            };
            this.socket.onclose = (event) => {
                    self.emit('close', event);
                };
            this.socket.onerror =  (err) => {
                self.emit('error', err);
            };

            this.socket.onmessage = (msg) =>

                self.emit('message', JSON.parse(msg.data));
        })
    };

    stream(event) {

        return new Promise((resolve, reject) => {
            if (this.socket.readyState !== WebSocket.OPEN) {
                return reject('socket is not ready' + this.socket.readyState);
            }
            this.socket.send(JSON.stringify(event), err => {
                if (err === undefined) {
                    return resolve('sent');
                } else {
                    return reject(err);
                };
            });
        });
    };

    stopStream() {
        if (this.socket !== undefined) {
            this.socket.close();
        }
    }


}
export default stream;
