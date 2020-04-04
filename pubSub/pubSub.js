import stream from '../rest/stream';


/* MIT License

Copyright (c) 2018 KubeMQ

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
const httpExec = require('../rest/httpExecuter');
const Event = require('../pubSub/lowLevel/event');


class PubSub {
    constructor(kubeMQHost, kubeMQRestPort, client, channelName, useStorage, group, isSecure) {
        if (kubeMQRestPort === undefined || kubeMQRestPort === null) {
            throw new Error('Please fill kubeMQRestPort');
        }
        this.kubeMQHost = kubeMQHost;
        this.kubeMQPort = isNaN(kubeMQRestPort) ? "9090" : kubeMQRestPort;
        this.channelName = channelName;
        this.client = client;
        this.store = useStorage;
        this.isSecure = isSecure;
        this.group = group;
        this.wsStream = undefined;
        this.wsReceive = undefined;
    }

    send(event) {

        let options;
        options = {
            'host': this.kubeMQHost,
            'port': this.kubeMQPort,
            'headers': {
                'Content-Type': 'application/json'
            }
        };

        event.Channel = this.channelName;
        event.ClientID = this.client;

        options.method = 'POST';

        options.path = '/send/event';

        event.store = this.store;

        if (this.isSecure) {
            return httpExec.getHttpsRequest(event, options);

        } else {

            return httpExec.getRequest(event, options);
        }

    };

    openStream() {
        let options = {
            headers: {
                'Content-Type': 'application/json'
            },
            rejectUnauthorized: false
        };

        let url = this.isSecure ? 'wss://' : 'ws://';
        url = url.concat(this.kubeMQHost.concat(':', this.kubeMQPort));
        url = url.concat('/send/stream');
        url = url.concat('?client_id=' + this.client);
        url = url.concat('&channel=' + this.channelName);

        if (this.group !== undefined) {
            url = url.concat('&group=' + this.group);
        }

        if (!this.store) {
            url = url.concat('&subscribe_type=events');
        } else {
            url = url.concat('&subscribe_type=events_store');
            url = url.concat('&events_store_type_data=' + this.store.Type);
            url = url.concat('&events_store_type_value=' + this.store.Value);
        }

        this.wsStream = new stream(url, options);
        this.wsStream.openStream();
        return this.wsStream;
    }

    stream(event) {
        event.Channel = this.channelName;
        event.ClientId = this.client;
        event.store = this.store;
        return this.wsStream.stream(event);
    }


    closeStream() {
        if (this.wsStream !== undefined) {
            this.wsStream.stopStream();
        }
    }


    subscribe(subscriberToEvents, errorHandler, storeProperties) {
        if (this.wsReceive === undefined) {

            let options = {rejectUnauthorized: false};

            let url = this.isSecure ? 'wss://' : 'ws://';
            url = url.concat(this.kubeMQHost.concat(':', this.kubeMQPort));
            url = url.concat('/subscribe/events');
            url = url.concat('?client_id=' + this.client);
            url = url.concat('&channel=' + this.channelName);

            if (this.group) {
                url = url.concat('&group=' + this.group);
            }

            if (!this.store) {
                url = url.concat('&subscribe_type=events');
            } else {
                url = url.concat('&subscribe_type=events_store');
                url = url.concat('&events_store_type_data=' + storeProperties.Type);
                url = url.concat('&events_store_type_value=' + storeProperties.Value);
            }
            this.wsReceive = new stream(url, options);
            this.wsReceive.openStream();
        };

        this.wsReceive.on('message', function incoming(data) {
            subscriberToEvents(data);
        });
        this.wsReceive.on('close', function incoming(code, number, reason) {
            errorHandler('closed socket on code:' + code + ', number:' + number + ', reason:' + reason);
        });
        return new Promise((resolve, reject) => {
            this.wsReceive.on('open', function open() {
                return resolve('socket open');
            });

            this.wsReceive.on('error', err => {
                if (errorHandler) {
                    errorHandler(err);
                }
                return reject(err);
            });
        });

    }

    unsubscribe() {
        if (this.wsReceive !== undefined) {
            this.wsReceive.stopStream();
        }
    }
};
//
export const StartNewOnly = 1;
export const StartFromFirst = 2;
export const StartFromLast = 3;
export const StartAtSequence = 4;
export const StartAtTime = 5;
export const StartAtTimeDelta = 6;
//
//
export default PubSub;
