'use strict';

//noinspection JSUnusedLocalSymbols
window.addEventListener('load', (event) => {
    // Control message types
    let messageType = {
        'windowSize': 0
    };

    // DOM elements
    let status = document.getElementById('status-bar');
    let content = document.getElementById('content');
    let connectionLabel = document.getElementById('l-connection');
    let connectionTab = document.getElementById('connection');
    let newTerminalLabel = document.getElementById('l-add');
    let paste = document.getElementById('paste-here');
    let localParameters = document.getElementById('local-parameters');
    let remoteParameters = document.getElementById('remote-parameters');
    let pasteInnerText = paste.innerText;

    class WebTerminalPeer {
        constructor(resetEventHandler) {
            this.terminals = [];
            this.peer = null;
            this.connected = false;
            this.previousPasteEventHandler = null;
            this.createPeerConnection();
            this.resetEventHandler = resetEventHandler;
        }

        static beautifyParameters(node, parameters) {
            if (!parameters) {
                parameters = JSON.parse(node.innerText);
            }

            // Parse and beautify
            node.innerText = JSON.stringify(parameters, null, 2);
        }


        reset() {
            // Update status
            status.className = 'red';

            // Reset parameters
            localParameters.innerHTML = '';
            remoteParameters.innerHTML = '';

            // Reset paste element
            paste.setAttribute('contenteditable', 'true');
            if (this.previousPasteEventHandler) {
                paste.onpaste = this.previousPasteEventHandler;
            }
            paste.className = '';
            paste.innerText = pasteInnerText;

            // Call handler
            console.info('Reset');
            if (this.resetEventHandler) {
                this.resetEventHandler();
            }
        }

        createPeerConnection() {
            // Create peer
            let peer = new ControllingPeer();
            peer.createPeerConnection();

            // Bind peer connection events
            //noinspection JSUnusedLocalSymbols
            peer.pc.oniceconnectionstatechange = (event) => {
                let state = peer.pc.iceConnectionState;
                console.log('ICE connection state changed to:', state);

                // Connected, yay!
                if (state == 'connected' || state == 'completed') {
                    this.connected = true;
                    status.className = 'green';
                }

                // Warn (if disconnected)
                if (state == 'disconnected' || state == 'checking') {
                    this.connected = false;
                    status.className = 'orange';
                }

                // Reset (if failed)
                if (state == 'failed') {
                    this.connected = false;
                    this.reset();
                }
            };

            // Create ignore-me data channel
            // Note: This channel is not going to be used, it simply exists to be able to create
            //       an offer that includes data channel parameters.
            var dc = peer.createDataChannel(peer.pc.createDataChannel('sensor'));

            // Bind data channel events
            //noinspection JSUnusedLocalSymbols
            dc.onopen = (event) => {
                console.log('Data channel "' + dc.label + '" open');
            };
            //noinspection JSUnusedLocalSymbols
            dc.onclose = (event) => {
                console.log('Data channel "' + dc.label + '" closed');
            };

            dc.onmessage = (event) => {
                let length = event.data.size || event.data.byteLength || event.data.length;
                console.info('Received', length, 'bytes over data channel "' + dc.label + '"');
                console.log(event.data);

                dc.send('got it!');
            };

            // Apply local parameters
            peer.getLocalParameters()
                .then((parameters) => {
                    console.log('Local parameters:', parameters);
                    localParameters.innerText = JSON.stringify(parameters);
                });

            // Done
            this.peer = peer;
        }

        parseWSURIOrParameters(text) {
            // Stop catching paste events
            paste.setAttribute('contenteditable', 'false');
            this.previousPasteEventHandler = paste.onpaste;
            paste.onpaste = (event) => {
                event.preventDefault();
            };

            // Remove current selections (or we'll get an error when selecting)
            window.getSelection().removeAllRanges();

            // Parse
            if (text.startsWith('ws://')) {
                // WebSocket URI
                paste.innerText = 'Connecting to WebSocket URI: ' + text;
                paste.classList.add('done');
                paste.classList.add('orange');
                this.startWS(text);
            } else {
                // Parse parameters
                let parameters = JSON.parse(text);

                // Copy & paste mode
                let parametersElement = localParameters;
                if (document.selection) {
                    let range = document.body.createTextRange();
                    range.moveToElementText(parametersElement);
                    range.select();
                } else if (window.getSelection) {
                    let range = document.createRange();
                    range.selectNode(parametersElement);
                    window.getSelection().addRange(range);
                }

                // Try copying to clipboard
                let copied = false;
                try {
                    copied = document.execCommand('copy');
                } catch (err) {}

                // Un-select if copied
                if (copied) {
                    window.getSelection().removeAllRanges();
                    paste.classList.add('done');
                    paste.classList.add('green');
                    paste.innerText = 'Parameters copied to clipboard! Paste them in the RAWRTC terminal ' +
                        'application.';
                } else {
                    paste.classList.add('done');
                    paste.classList.add('orange');
                    paste.innerText = 'Copy & paste the selected parameters in the RAWRTC terminal ' +
                        'application.';
                }

                // Set remote parameters
                this.setRemoteParameters(parameters);
            }
        }

        setRemoteParameters(parameters) {
            // Beautify local and remote parameters
            WebTerminalPeer.beautifyParameters(localParameters);
            WebTerminalPeer.beautifyParameters(remoteParameters, parameters);

            // Set remote parameters
            console.log('Remote parameters:', parameters);
            this.peer.setRemoteParameters(parameters)
                .catch((error) => {
                    console.error(error);
                });
        }

        startWS(uri) {
            // Beautify local parameters
            WebTerminalPeer.beautifyParameters(localParameters);

            // Create WebSocket connection
            let ws = new WebSocket(uri);

            // Bind WebSocket events
            //noinspection JSUnusedLocalSymbols
            ws.onopen = (event) => {
                console.log('WS connection open');

                // Send local parameters
                this.peer.getLocalParameters().then((parameters) => {
                    console.info('Sending local parameters');
                    ws.send(JSON.stringify(parameters));
                });
            };
            ws.onerror = (event) => {
                console.log('WS connection error:', event);
            };
            //noinspection JSUnusedLocalSymbols
            ws.onclose = (event) => {
                console.log('WS connection closed');
            };
            ws.onmessage = (event) => {
                let length = event.data.size || event.data.byteLength || event.data.length;
                console.log('WS message of', length, 'bytes received');

                // Parse remote parameters
                let parameters = JSON.parse(event.data);
                paste.className = 'green';
                paste.classList.remove('orange');
                paste.classList.add('green');
                paste.innerText = 'Received parameters from WebSocket URI: ' + uri;
                this.setRemoteParameters(parameters);

                // Close WebSocket connection
                ws.close();
            };
        }

    }

    let start = () => {
        // Create peer and make peer globally available
        let peer = new WebTerminalPeer(() => {
            console.info('Restart');
            start();
        });
        //noinspection JSUndefinedPropertyAssignment
        window.peer = peer;

        // Autofocus paste area
        paste.focus();

        // Catch pasted data
        paste.onpaste = (event) => {
            event.preventDefault();

            // If no clipboard data is available, do nothing.
            if (!event.clipboardData) {
                return;
            }

            if (event.clipboardData.types) {
                // Loop the data store in type and display it
                for (let i = 0; i < event.clipboardData.types.length; ++i) {
                    let type = event.clipboardData.types[i];
                    let value = event.clipboardData.getData(type);
                    if (type == 'text/plain') {
                        peer.parseWSURIOrParameters(value);
                        break;
                    }
                }

            } else {
                // Look for access to data if types array is missing
                let text = event.clipboardData.getData('text/plain');
                peer.parseWSURIOrParameters(text);
            }
        };
    };

    // Start
    console.info('Start');
    start();
});
