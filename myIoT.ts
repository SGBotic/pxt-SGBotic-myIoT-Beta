//%color=#5e41f0 icon="\uf1eb" block="myIoT"

namespace SGBotic {


    class wifi_serial_class {
        sending_data: boolean

        constructor() {
            this.sending_data = false
        }
    }

    class wifi_comm_Class {
        wifiConnected: boolean
        wifiModuleReady: boolean
        // CWMODE_OK: boolean
        //CWQAP_Ok: boolean
        resp_ok: boolean
        ipAddress: string
        sending_data: boolean

        constructor() {
            this.wifiConnected = false
            this.wifiModuleReady = false
            //this.CWMODE_OK = false
            //this.CWQAP_Ok = false
            this.resp_ok = false
            this.ipAddress = ""
            this.sending_data = false

        }
    }

    //type EvtUbidotsDevice = (device: string, variable: string) => void;

    let wifi_connected: boolean = false
    let resp_str: string = ""
    let led_Feedback: boolean = true

    let ubidot_server: string = "industrial.api.ubidots.com"
    let ubidotsToken: string = ""
    let ubidotsAPIToken: string = ""
    //let ubi_connected: string = ""
    let http_status: string = ""

    let wifi_serial_obj = new wifi_serial_class()

    //let ubidotsDevice: EvtUbidotsDevice = null;
    //let wifiCommObj = new wifi_comm_Class();

    export enum OnOffNum {
        //%block="On"
        On = 1,
        //%block="Off"
        Off = 0
    }

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        wifi_serial_obj.sending_data = true
        serial.writeString(command + "\u000D\u000A")
        //basic.pause(wait)
        wifi_serial_obj.sending_data = false
    }

    function cmdResponse(resp_code: string): boolean {
        let response_str: string = ""
        let time: number = input.runningTime()

        while (true) {
            response_str += serial.readString()
            if (response_str.includes(resp_code)) {
                resp_str = response_str;
                return true;
            }
            if (input.runningTime() - time > 30000) {
                return false;
            }
        }
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            //serial_str += serial.readUntil(serial.delimiters(Delimiters.NewLine))
            //if (serial_str.length >100) serial_str = serial_str.substr(serial_str.length - 100)
            if (serial_str.includes("OK") && serial_str.includes("CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 10000) break
        }
        return result
    }

    function cipStatusResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.includes("OK") && serial_str.includes("STATUS:4")) {
                result = true
                break
            } else if (serial_str.includes("OK") || serial_str.includes("STATUS:3")) {
                break
            }
            if (input.runningTime() - time > 10000) break
        }
        return result
    }

    /**
    * myIoT connect to wifi
    * @param Configure pin for serial communication
    */
    //% subcategory=myIoT-Beta
    //% weight=10 color=#CA85F1
    //% group="Wifi"
    //% pinRX.fieldEditor="gridpicker" pinRX.fieldOptions.columns=3
    //% pinTX.fieldEditor="gridpicker" pinTX.fieldOptions.columns=3
    //% blockId="myIoT Init" block="Connect myIoT module | Serial setup: |RX pin connect to %pinTX|TX pin connect to %pinRX | Wifi setup:| SSID %ssid|Password: %pwd"
    //% pinTX.defl=SerialPin.P0 
    //% pinRX.defl=SerialPin.P1
    //% ssid.defl=wifi_SSID
    //% pwd.defl=wifi_password
    export function myIoT_module_init(pinTX: SerialPin, pinRX: SerialPin, ssid: string, pwd: string): void {
        wifi_connected = false
        let resp_ok: boolean = false;

        serial.setTxBufferSize(200)
        serial.setRxBufferSize(200)

        serial.redirect(
            pinTX,
            pinRX,
            BaudRate.BaudRate115200
        )
        sendAT("AT+RESTORE") // restore to factory settings
        resp_ok = cmdResponse("ready");

        sendAT("AT+CWMODE=1") // set to STA (station or client) mode
        resp_ok = cmdResponse("OK");

        sendAT("AT+CWQAP")
        resp_ok = cmdResponse("OK");

        //sendAT("AT+RST", 1000) // reset
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pwd + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        if (led_Feedback) {
            if (wifi_connected) {
                basic.showLeds(`
                . . . . #
                . . . # .
                # . # . .
                . # . . .
                . . . . .
                `)
            } else {
                basic.showLeds(`
                # . . . #
                . # . # .
                . . # . .
                . # . # .
                # . . . #
                `)
            }

        }
        //sendAT("AT+CWJAP?")
        //basic.pause(1000)
    }

    /**
    * Get Wifi Connection Status
    */
    //% subcategory=myIoT-Beta
    //% weight=10 color=#CA85F1
    //% group="Wifi"
    //% block="wifi connected?"
    export function getWifiConectionStatus(): boolean {
        if (wifi_connected)
            return true
        else
            return false
    }

    /**
    * Get IP Address
    */
    //% subcategory=myIoT-Beta
    //% weight=10 color=#CA85F1
    //% group="Wifi"
    //% block="IP address"
    export function getIP(): string {

        let serial_str: string = ""
        let strData: string = ""
        let count: number = 0
        let str_completed: boolean = false;

        let time: number = input.runningTime()
        if (wifi_connected) {
            sendAT("AT+CIFSR");
            if (cmdResponse("OK")) {
                serial_str = resp_str;
                count = serial_str.indexOf("\"") + 1  //to remove \"
                strData = serial_str.substr(count, 16)
                count = strData.indexOf("\"")
                strData = strData.substr(0, count)

                return strData;
            } else
                return "ERR"
        } else
            return "wifi not connected"
    }


    /**
    * Enable feedback through microbit Matrix LEDs
    */
    //% subcategory=myIoT-Beta
    //% weight=10 color=#CA85F1
    //% group="Wifi"
    //% blockId="LEDFeedback" block="LED matrix feedback %stat"
    export function LEDFeedback(stat: OnOffNum): void {
        if (stat == OnOffNum.On)
            led_Feedback = true  //enable LED matrix feedback
        else
            led_Feedback = false  //disable LED matrix feedback
    }


    /**
    * Get latest value of variable from Ubidots IoT platform
    */
    //% subcategory=myIoT-Beta
    //% weight=20 color=#5dd475
    //% group="Ubidots"
    //% blockId="ubidotsReadVal" block="Read value from |device %ubidotsDevice|variable %ubidotsVariable"
    //% ubidotsDevice.defl=deviceID
    //% ubidotsVariable.defl=variableID
    export function ububidotsReadValidotsSub(ubidotsDevice: string, ubidotsVariable: string): string {
        let ackTemp: string = ""
        let varString: string = ""

        while (wifi_serial_obj.sending_data) {
            basic.pause(100)
        }

        wifi_serial_obj.sending_data = true;

       //
       //
        clearRxBuffer();
        sendAT("AT+CIPRECVMODE=1")
        cmdResponse("OK")

        let request: string = "GET /api/v1.6/devices/" + ubidotsDevice + "/" + ubidotsVariable + "/values/?page_size=1 HTTP/1.1" + "\u000D\u000A" +
            "Host: " + ubidot_server + "\u000D\u000A" +
            "User-Agent: CW01/1.0" + "\u000D\u000A" +
            "Accept: */*" + "\u000D\u000A" +
            "X-Auth-Token: " + ubidotsAPIToken + "\u000D\u000A" +
            "Content-Type: application/json" + "\u000D\u000A" + "\u000D\u000A"


        sendAT("AT+CIPSEND=" + (request.length).toString())
        basic.pause(100)
        sendAT(request)
        basic.pause(1000)

        sendAT("AT+CIPRECVDATA=200")
        basic.pause(50)
        varString += serial.readString()
        basic.pause(50)
        varString = ""

        sendAT("AT+CIPRECVDATA=100")
        basic.pause(50)
        varString += serial.readString()
        basic.pause(50)
        varString = ""

        sendAT("AT+CIPRECVDATA=200")
        basic.pause(50)
        varString += serial.readString()
        basic.pause(50)

        let count: number = varString.indexOf("\"value\": ") + "\"value\": ".length
        let strData: string = varString.substr(count, 16)
        count = strData.indexOf(",")
        strData = strData.substr(0, count)

        wifi_serial_obj.sending_data = false;
        sendAT("AT+CIPRECVMODE=0")
        cmdResponse("OK")
        return strData
    }


    /**
    * Connect to Ubidots IoT platform Token
    */
    //% subcategory=myIoT-Beta
    //% weight=20 color=#5dd475
    //% group="Ubidots"
    //% blockId="connectUbidots" block="Connect to Ubidots with token %TKN"
    //% TKN.defl=your_ubidots_token
    export function connectUbidots(TKN: string): void {
        ubidotsAPIToken = TKN

        sendAT("AT+CIPSTART=\"TCP\",\"industrial.api.ubidots.com\",80")
        cmdResponse("OK");
    }

    /**
    * Send numerical value to Ubidots IoT platform. 
    */
    //% subcategory=myIoT-Beta
    //% weight=91 color=#5dd475
    //% group="Ubidots"
    //% blockId="sendValueToUbidots" block="send value %value to Ubidots device %device variable %variable"
    //% device.defl=deviceID
    //% variable.defl=variableID
    export function IoTSendValueToUbidots(value: number, device: string, variable: string): void {
        let ackTemp: string = ""

        while (wifi_serial_obj.sending_data) {
            basic.pause(100)
        }

        wifi_serial_obj.sending_data = true;

        //
        //
        
        ackTemp = ""
        // do {
        let payload: string = "{\"value\": " + value.toString() + "}"

        let request: string = "POST /api/v1.6/devices/" + device + "/" + variable + "/values HTTP/1.1" +
            "\u000D\u000A" +
            "Host: " + ubidot_server + "\u000D\u000A" +
            "User-Agent: CW01/1.0" + "\u000D\u000A" +
            "X-Auth-Token: " + ubidotsAPIToken + "\u000D\u000A" +
            "Content-Type: application/json" + "\u000D\u000A" +
            "Connection: keep-alive" + "\u000D\u000A" +
            "Accept: */*" + "\u000D\u000A" +
            "Content-Length: " + (payload.length).toString() + "\u000D\u000A" + "\u000D\u000A" + payload + "\u000D\u000A"

        sendAT("AT+CIPSEND=" + (request.length).toString())
        basic.pause(300)
        sendAT(request)
        basic.pause(1000)
        ackTemp = serial.readString()

        wifi_serial_obj.sending_data = false
    }


    //% shim=serialBuffer::setSerialBuffer
    function setSerialBuffer(size: number): void {
        return null;
    }

    //% shim=serialBuffer::clearRxBuffer
    function clearRxBuffer(): void {
        return null;
    }
}