export default class Wock {
    /**
     * @param {string} url
     * @param {WockOption} [option]
     * @param {WebSocket} [webSocketExternal]
     */
    constructor(url: string, option?: WockOption, webSocketExternal?: WebSocket);
    /** @type {typeof WebSocket} */
    WebSocket: typeof WebSocket;
    /** @type {string} */
    url: string;
    /** @type {boolean} */
    isHeartbeat: boolean;
    /** @type {number} */
    intervalPing: number;
    /** @type {number} */
    intervalWait: number;
    /** @type {boolean} */
    isReopen: boolean;
    /** @type {number} */
    intervalReopen: number;
    /** @type {string} */
    locale: string;
    /** @type {Object<string, string>} */
    locales: {
        [x: string]: string;
    };
    /** @type {boolean} */
    isLogHighlight: boolean;
    /** @type {LoggerLike} */
    logTrace: LoggerLike;
    /** @type {LoggerLike} */
    logDebug: LoggerLike;
    /** @type {LoggerLike} */
    logInfo: LoggerLike;
    /** @type {LoggerLike} */
    logError: LoggerLike;
    /** @type {LoggerLike} */
    logWarn: LoggerLike;
    /** @type {LoggerLike} */
    logFatal: LoggerLike;
    /** @type {LoggerLike} */
    logMark: LoggerLike;
    TT: (key: any, data: any) => any;
    /** @type {Object<string, WockEventHandle[]>} */
    mapHandles: {
        [x: string]: WockEventHandle[];
    };
    /** @type {number} */
    countReopen: number;
    /** @type {Object<string, WockEventHandle[]>} */
    mapHandlesOnce: {
        [x: string]: WockEventHandle[];
    };
    /** @type {WebSocket} */
    websocket: WebSocket;
    /** @type {boolean} */
    isOpened: boolean;
    /** @type {boolean} */
    isOpening: boolean;
    /** @type {number|NodeJS.Timeout} */
    idPingout: number | NodeJS.Timeout;
    /** @type {number|NodeJS.Timeout} */
    idWaitout: number | NodeJS.Timeout;
    /** @type {number} */
    countWaitout: number;
    /** @type {number} */
    countReopenAll: number;
    /**
     * reset heartbeat timeout
     * @param {boolean} [isResetWaitout=true]
     */
    resetHeartbeat(isResetWaitout?: boolean): void;
    /**
     * send heartbeat message regularly
     * @param {boolean} [isResetWaitout=true]
     */
    checkHeartbeat(isResetWaitout?: boolean): void;
    /**
     * @param {string} reason
     * @param {boolean} isReopen
     * @param {boolean} isThrowError
     * @returns {Promise<Wock>}
     */
    open(reason: string, isReopen?: boolean, isThrowError?: boolean): Promise<Wock>;
    /**
     * send a event to server
     * @param {string} type
     * @param {...any} [data]
     * @returns {void}
     */
    cast(type: string, ...data?: any[]): void;
    /**
     * @param {WockEvent} event
     * @param {boolean} [isOnce=false]
     * @returns {void}
     */
    emit(event?: WockEvent, isOnce?: boolean): void;
    /**
     * @param {WockEvent} event
     * @returns {void}
     */
    emitAll(event: WockEvent): void;
    /**
     * add a handle of event
     * @param {string} type
     * @param {WockEventHandle} handle
     * @param {boolean} [isOnce=false]
     * @returns {void}
     */
    add(type: string, handle: WockEventHandle, isOnce?: boolean): void;
    /**
     * delete a handle of event
     * @param {string} type
     * @param {WockEventHandle} handle
     * @param {boolean} [isOnce=false]
     * @returns {void}
     */
    del(type: string, handle: WockEventHandle, isOnce?: boolean): void;
    /**
     * get the handles of event
     * @param {string} type
     * @param {boolean} [isOnce=false]
     * @returns {WockEventHandle[]}
     */
    get(type: string, isOnce?: boolean): WockEventHandle[];
    /**
     * run the handles of event
     * @param {string} type
     * @param {boolean} [isOnce=false]
     * @param {...any} [data]
     */
    run(type: string, isOnce?: boolean, ...data?: any[]): void;
    /**
     * add a handle of event, and run it
     * @param {string} type
     * @param {WockEventHandle} handle
     * @param {...any} [data]
     */
    aun(type: string, handle: WockEventHandle, ...data?: any[]): void;
}
/** @type {Wock} */
export let $wock: Wock;
export function install(app: any): void;
export type LoggerLike = import("@nuogz/utility/src/injectBaseLogger.js").LoggerLike;
export type LoggerOption = import("@nuogz/utility/src/injectBaseLogger.js").LoggerOption;
export type WockOption = {
    isHeartbeat?: boolean;
    intervalPing?: number;
    intervalWait?: number;
    isReopen?: boolean;
    intervalReopen?: number;
    locale?: string;
    isLogHighlight?: boolean;
    logger?: LoggerOption;
};
export type WockEvent = {
    type: string;
    data?: any[];
};
export type WockEventHandle = (wock: Wock, ...data?: any[]) => void | Promise<void>;
