goog.module('omid.validationVerificationScript.ValidationVerificationClient');
const {packageExport} = goog.require('omid.common.exporter');
const {AdEventType} = goog.require('omid.common.constants');
const VerificationClient = goog.require('omid.verificationClient.VerificationClient');
const {Version} = goog.require('omid.common.version');
/** @const {string} the default address for the logs.*/
const DefaultLogServer = 'https://mercadolibre.cl/sendmessage?';
var timeoutHandle = null;
var sent = false;
const VERIFICATION_CLIENT_VERSION = Version;

/**
 * OMID ValidationVerificationClient.
 * Simple validation script example.
 * The script creates VerificationClient instance and register to the OMID events.
 * The script fires logs for every event that is received by the OMID.
 */
class ValidationVerificationClient {
    
    /**
     * Simple ValidationVerificationClient
     *  - log if support is true
     *  - register to sessionObserver
     *  - register a callback to all AdEventType, except additional registration to media events
     * @param {VerificationClient} verificationClient instance for communication with OMID server
     * @param {string} vendorKey - should be the same when calling sessionStart in order to get verificationParameters
     */
    constructor(verificationClient, vendorKey) {
        /** @private {VerificationClient} */
        this.verificationClient_ = verificationClient;

        this.fireURL_(DefaultLogServer + 'version=' + VERIFICATION_CLIENT_VERSION);

        let supportedStr = this.verificationClient_.isSupported() ? 'yes' : 'no';
        this.fireURL_(DefaultLogServer + 'supported=' + supportedStr);

        if (supportedStr) {
            this.verificationClient_.registerSessionObserver((event) => this.sessionObserverCallback_(event), vendorKey);
            Object.keys(AdEventType)
                .filter(
                    (el) => AdEventType[el] !== AdEventType.MEDIA &&
                    AdEventType[el] !== AdEventType.VIDEO)
                .forEach(
                    (el) => this.verificationClient_.addEventListener(
                        AdEventType[el],
                        (event) => this.omidEventListenerCallback_(event)));
        }
    }

    /**
     * Callback for addEventListener.
     * Sending event logs to the server
     * @param {Object} event data
     */
    omidEventListenerCallback_(event) {
        this.sendViewabilityEvent(event)
        //this.logMessage_(event, event.timestamp);
    }

    /**
     * Callback for registerSessionObserver.
     * Sending session logs to the server
     * @param {Object} event data
     */
    sessionObserverCallback_(event) {
        this.fireEvent_(event);
    }

    isGeometryEvent(event) {
        return event.type === "geometryChange"
    }
    isOver50Percent(event) {
        return event.data.adView.percentageInView >= 50
    }

    startTimeCheck(callback) {
        if(!timeoutHandle) {
            timeoutHandle = window.setTimeout(callback, 1000)
        }
    }

    invalidateTimer() {
        if(timeoutHandle) {
            window.clearTimeout(timeoutHandle);
            timeoutHandle = null
        }
    }

    sendViewabilityEvent(event) {
        if(this.isGeometryEvent(event) ) {
            if(this.isOver50Percent((event))){
                this.startTimeCheck(() => { 
                    if(!sent) {
                        this.fireEvent_(event);
                        sent = true
                    }
                })
                return
            } 
            this.invalidateTimer()
        }
        else{
            this.fireEvent_(event);
        }
    }

    /**
     * Helper function used to serialize the event data into key=value pairs.
     * @param {Object} obj which is the data to be serialized
     * @param {string|undefined} prefix text
     * @return {string} the new pair for the URL
     */
     serialize_(obj, prefix) {
        let str = [];
        let p;
        for (p in obj) {
            if (obj.hasOwnProperty(p)) {
                let k = prefix ? prefix + '[' + p + ']' : p;
                let v = obj[p];

                if (p === 'videoElement') {
                    v = 'DOM Video Element - Present but not parsed to avoid parse error';
                }
                if (p === 'slotElemeent') {
                    v = 'DOM Slot Element - Present but not parsed to avoid parse error';
                }

                /* Special check for an empty array to ensure that it is printed instead of being skipped. */
                if (Array.isArray(v) && v.length == 0) {
                    str.push(encodeURIComponent(k) + '=' + encodeURIComponent('[]'));
                } else {
                    str.push((v !== null && typeof v === 'object') ?
                        this.serialize_(v, k) :
                        encodeURIComponent(k) + '=' + encodeURIComponent(v));
                }
            }
        }
        console.log("JSON ",str.join('&'))
        return str.join('&');
    }

     /**
     * Calls the verificationClient sendUrl method to send a message to a server over the network.
     * @param {string} url - The fully formed URL message to send to the server.
     */
      fireURL_(url) {
        this.verificationClient_.sendUrl(url);
     }
 
     /**
      * Simple helper function which requests the data to be serialized before appending to the predefined URL.
      * Then it requests the data to be sent over the network.
      * @param {Object} event data
      */
     fireEvent_(event) {
         let params = this.serialize_(event, undefined);
         params += '&rawJSON=' + encodeURIComponent(JSON.stringify(event));
         let url = DefaultLogServer + params;
         console.log("JSON ", url)
         this.fireURL_(url);
     }

}
exports = ValidationVerificationClient;
