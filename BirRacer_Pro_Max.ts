//% color="#ff6600" weight=100 icon="\uf1b9" block="循線自走車"

namespace SmartCar {
    const I2C_ADDR = 0x10
    // 指令集 
    const CMD_IR_ALL = 0x38
    const CMD_ENCODER_GET = 0x40
    const CMD_ENCODER_CLR = 0x41
    const CMD_LED_CONTROL = 0x42
    const CMD_ULTRASONIC_GET = 0x43
    const CMD_LCD_TEXT = 0x44
    const CMD_LCD_CLEAR = 0x45
    const CMD_LCD_IMAGE = 0x46
    const CMD_LCD_BG = 0x47

    // 緩衝區
    let motorBuf = pins.createBuffer(3)
    let switchBuf = pins.createBuffer(2)
    let encoderBuf = pins.createBuffer(8)
    let ledBuf = pins.createBuffer(3)
    let imgBuf = pins.createBuffer(2)

    // 選單
    export enum MotorList { 左輪 = 0x20, 右輪 = 0x21, 雙輪 = 0x22 }
    export enum EncoderSelection { 左輪 = 0, 右輪 = 1, 兩輪平均 = 2 }
    export enum LEDList { 左邊 = 0, 右邊 = 1, 兩邊 = 2 }
    export enum LCDColor { 白 = 0, 紅 = 1, 綠 = 2, 藍 = 3, 黑 = 4, 黃 = 5, 橘 = 6 }
    export enum LogoList { 圖一 = 0, 圖二 = 1 }

    //% block="紅外線開關 %on"
    //% inlineInputMode=inline on.shadow="toggleOnOff" weight=100 group="感測器控制" color="#008000"
    export function setIRPower(on: boolean): void {
        switchBuf[0] = 0x37; switchBuf[1] = on ? 1 : 0
        pins.i2cWriteBuffer(I2C_ADDR, switchBuf, false)
    }

    //% block="讀取第 %index 顆 感測器"
    //% inlineInputMode=inline index.min=0 index.max=6 weight=99 group="感測器控制" color="#008000"
    export function getIR(index: number): number {
        pins.i2cWriteNumber(I2C_ADDR, 0x30 + index, NumberFormat.Int8LE, false)
        control.waitMicros(100)
        return pins.i2cReadNumber(I2C_ADDR, NumberFormat.UInt16BE, false)
    }

    //% block="一次讀取七顆紅外線"
    //% weight=98 group="感測器控制" color="#008000"
    export function getAllIRValues(): number[] {
        pins.i2cWriteNumber(I2C_ADDR, CMD_IR_ALL, NumberFormat.Int8LE, false)
        control.waitMicros(200)
        let allIrBuf = pins.i2cReadBuffer(I2C_ADDR, 14, false)
        let irArray: number[] = []
        for (let i = 0; i < 7; i++) {
            let val = allIrBuf.getNumber(NumberFormat.UInt16BE, i * 2)
            irArray.push(val)
        }
        return irArray
    }

    //% block="設定 %led LED狀態為 %on"
    //% inlineInputMode=inline on.shadow="toggleOnOff" weight=97 group="感測器控制" color="#008000"
    export function setLED(led: LEDList, on: boolean): void {
        ledBuf[0] = CMD_LED_CONTROL; ledBuf[1] = led; ledBuf[2] = on ? 1 : 0
        pins.i2cWriteBuffer(I2C_ADDR, ledBuf, false)
    }

    //% block="讀取超音波距離 (cm)"
    //% inlineInputMode=inline weight=96 group="感測器控制" color="#008000"
    export function getUltrasonicDistance(): number {
        pins.i2cWriteNumber(I2C_ADDR, CMD_ULTRASONIC_GET, NumberFormat.Int8LE, false)
        control.waitMicros(100)
        let dist = pins.i2cReadNumber(I2C_ADDR, NumberFormat.UInt16BE, false)
        if (dist > 99) {
            return 99; // 如果距離超過 100 (或是讀不到回傳 999)，一律只顯示 100
        } else {
            return dist;
        }
    }

    //% block="設定馬達 %motor 速度 %speed"
    //% inlineInputMode=inline speed.min=-1000 speed.max=1000 weight=80 color="#0078d7" group="馬達 & 編碼器控制 "
    export function setMotor(motor: MotorList, speed: number): void {
        if (speed > 1000) speed = 1000; if (speed < -1000) speed = -1000
        let finalSpeed = speed; if (finalSpeed < 0) finalSpeed += 0x10000
        motorBuf[0] = motor; motorBuf[1] = (finalSpeed >> 8) & 0xFF; motorBuf[2] = finalSpeed & 0xFF
        pins.i2cWriteBuffer(I2C_ADDR, motorBuf, false)
    }

    //% block="讀取 %wheel 編碼器數值"
    //% inlineInputMode=inline weight=60 color="#0078d7" group="馬達 & 編碼器控制 "
    export function getEncoderValue(wheel: EncoderSelection): number {
        pins.i2cWriteNumber(I2C_ADDR, CMD_ENCODER_GET, NumberFormat.Int8LE, false)
        control.waitMicros(100)
        encoderBuf = pins.i2cReadBuffer(I2C_ADDR, 8, false)
        let l = encoderBuf.getNumber(NumberFormat.Int32BE, 0)
        let r = encoderBuf.getNumber(NumberFormat.Int32BE, 4)
        if (wheel === EncoderSelection.右輪) {
            return r
        } else if (wheel === EncoderSelection.左輪) {
            return l
        } else {
            // 如果選的是「平均」，就回傳兩者相加除以二 (並四捨五入取整數)
            return Math.round((l + r) / 2)
        }
    }

    //% block="編碼器數值歸零"
    //% inlineInputMode=inline weight=59 color="#0078d7" group="馬達 & 編碼器控制 "
    export function clearEncoders(): void {
        pins.i2cWriteNumber(I2C_ADDR, CMD_ENCODER_CLR, NumberFormat.Int8LE, false)
    }

    //% block="設定背景顏色 %color"
    //% inlineInputMode=inline weight=55 group="LCD 顯示"
    export function setBackgroundColor(color: LCDColor): void {
        let buf = pins.createBuffer(2)
        buf[0] = CMD_LCD_BG; buf[1] = color
        pins.i2cWriteBuffer(I2C_ADDR, buf, false)
        control.waitMicros(10000)
    }

    //% block="顯示文字 %text | 顏色 %color | 位置 x:%x y:%y"
    //% inlineInputMode=inline x.min=0 x.max=160 y.min=0 y.max=128 color.defl=LCDColor.White weight=54 group="LCD 顯示"
    export function lcdShowString(text: string, color: LCDColor, x: number, y: number): void {
        let len = text.length
        if (len > 25) len = 25
        let buf = pins.createBuffer(4 + len)
        buf[0] = CMD_LCD_TEXT; buf[1] = x; buf[2] = y; buf[3] = color
        for (let i = 0; i < len; i++) buf[4 + i] = text.charCodeAt(i)
        pins.i2cWriteBuffer(I2C_ADDR, buf, false)
        control.waitMicros(1000)
    }

    //% block="顯示數字 %num | 顏色 %color | 位置 x:%x y:%y"
    //% inlineInputMode=inline x.min=0 x.max=160 y.min=0 y.max=128 weight=53 group="LCD 顯示"
    export function lcdShowNumber(num: number, color: LCDColor, x: number, y: number): void {
        lcdShowString("" + num, color, x, y)
    }

    //% block="清除所有畫面"
    //% inlineInputMode=inline weight=52 group="LCD 顯示"
    export function lcdClear(): void {
        pins.i2cWriteNumber(I2C_ADDR, CMD_LCD_CLEAR, NumberFormat.Int8LE, false)
        control.waitMicros(2000)
    }

    //% block="顯示 %logo"
    //% inlineInputMode=inline weight=51 group="LCD 顯示"
    export function showLogo(logo: LogoList): void {
        imgBuf[0] = CMD_LCD_IMAGE
        imgBuf[1] = logo
        pins.i2cWriteBuffer(I2C_ADDR, imgBuf, false)
        control.waitMicros(50000)
    }
}