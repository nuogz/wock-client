export default class Wock {
    /**
     * @param {string} url
     * @param {WockOption} [option]
     * @param {WebSocket} [webSocketExternal]
     */
    constructor(url: string, option?: WockOption | undefined, webSocketExternal?: WebSocket | undefined);
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
    resetHeartbeat(isResetWaitout?: boolean | undefined): void;
    /**
     * send heartbeat message regularly
     * @param {boolean} [isResetWaitout=true]
     */
    checkHeartbeat(isResetWaitout?: boolean | undefined): void;
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
    cast(type: string, ...data?: any[] | undefined): void;
    /**
     * @param {WockEvent} event
     * @param {boolean} [isOnce=false]
     * @returns {void}
     */
    emit(event?: WockEvent, isOnce?: boolean | undefined): void;
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
    add(type: string, handle: WockEventHandle, isOnce?: boolean | undefined): void;
    /**
     * delete a handle of event
     * @param {string} type
     * @param {WockEventHandle} handle
     * @param {boolean} [isOnce=false]
     * @returns {void}
     */
    del(type: string, handle: WockEventHandle, isOnce?: boolean | undefined): void;
    /**
     * get the handles of event
     * @param {string} type
     * @param {boolean} [isOnce=false]
     * @returns {WockEventHandle[]}
     */
    get(type: string, isOnce?: boolean | undefined): WockEventHandle[];
    /**
     * run the handles of event
     * @param {string} type
     * @param {boolean} [isOnce=false]
     * @param {...any} [data]
     */
    run(type: string, isOnce?: boolean | undefined, ...data?: any[] | undefined): void;
    /**
     * add a handle of event, and run it
     * @param {string} type
     * @param {WockEventHandle} handle
     * @param {...any} [data]
     */
    aun(type: string, handle: WockEventHandle, ...data?: any[] | undefined): void;
}
/** @type {Wock} */
export let $wock: Wock;
export function install(app: any): void;
export type LoggerLike = import("@nuogz/utility/src/inject-base-logger.pure.js").LoggerLike;
export type LoggerOption = import("@nuogz/utility/src/inject-base-logger.pure.js").LoggerOption;
export type WockOption = {
    isHeartbeat?: boolean | undefined;
    intervalPing?: number | undefined;
    intervalWait?: number | undefined;
    isReopen?: boolean | undefined;
    intervalReopen?: number | undefined;
    isLogHighlight?: boolean | undefined;
    logger?: import("@nuogz/utility/src/inject-base-logger.pure.js").LoggerOption | undefined;
};
export type WockEvent = {
    type: string;
    data?: any[] | undefined;
};
export type WockEventHandle = (wock: Wock, ...data?: any[] | undefined) => void | Promise<void>;
