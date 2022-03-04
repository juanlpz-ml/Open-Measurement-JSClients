goog.module('omid.validationVerificationScript.ValidationVerificationClient');
const {packageExport} = goog.require('omid.common.exporter');
const {AdEventType} = goog.require('omid.common.constants');
const VerificationClient = goog.require('omid.verificationClient.VerificationClient');
/** @const {string} the default address for the logs.*/
const DefaultLogServer = 'http://mercadolibre.com/sendMessage?msg=';
var timeoutHandle = null;
var wasSend = false;
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
        const isSupported = this.verificationClient_.isSupported();
        this.logMessage_('OmidSupported['+isSupported+']', (new Date()).getTime());
        if (isSupported) {
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
     * Log message to the server
     * Message will have the format: <Date> :: <Message>
     * For example: 10/8/2017, 10:41:11 AM::"OmidSupported[true]"
     * @param {Object|string} message to send to the server
     * @param {number} timestamp of the event
     */
    logMessage_(message, timestamp) {
        const log = (new Date(timestamp)).toLocaleString()+ '::' + JSON.stringify(message);
        console.log(log);
        this.sendUrl_(log);
    }

    /**
     * Call verificationClient sendUrl for message with the correct logServer
     * @param {string} message to send to the server
     */
    sendUrl_(message) {
        const url = (DefaultLogServer + encodeURIComponent(message));
        console.log(url);
        this.verificationClient_.sendUrl(url);
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
        this.logMessage_(event, event.timestamp);
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
                    if(!wasSend ) {
                        this.logMessage_(event, event.timestamp) 
                        wasSend = true
                    }
                })
                return
            } 
            this.invalidateTimer()
        }
    }

}
exports = ValidationVerificationClient;
