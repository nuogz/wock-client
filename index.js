import { injectBaseLogger } from '@nuogz/utility';

import { T } from './src/i18n.lib.js';



/** @typedef {import("@nuogz/utility/src/inject-base-logger.pure.js").LoggerLike} LoggerLike */

/** @typedef {import("@nuogz/utility/src/inject-base-logger.pure.js").LoggerOption} LoggerOption */


/**
 * @typedef {Object} WockOption
 * @property {boolean} [isHeartbeat=true]
 * @property {number} [intervalPing=10000]
 * @property {number} [intervalWait=24000]
 * @property {boolean} [isReopen=true]
 * @property {number} [intervalReopen=4000]
 * @property {boolean} [isLogHighlight=false]
 * @property {LoggerOption} [logger]
 */


/**
 * @typedef {Object} WockEvent
 * @property {string} type
 * @property {any[]} [data]
 */

/**
 * @callback WockEventHandle
 * @param {Wock} wock
 * @param {...any} [data]
 * @returns {void|Promise<void>}
 */


const hasOption = (key, object) => key in object && object[key] !== undefined;



export default class Wock {
	/** @type {typeof WebSocket} */
	WebSocket;


	/** @type {string} */
	url;


	/** @type {boolean} */
	isHeartbeat = false;

	/** @type {number} */
	intervalPing = 10000;
	/** @type {number} */
	intervalWait = 24000;


	/** @type {boolean} */
	isReopen = true;

	/** @type {number} */
	intervalReopen = 4000;


	/** @type {boolean} */
	isLogHighlight = false;
	/** @type {LoggerLike} */
	logTrace = () => { };
	/** @type {LoggerLike} */
	logDebug = () => { };
	/** @type {LoggerLike} */
	logInfo = () => { };
	/** @type {LoggerLike} */
	logError = () => { };
	/** @type {LoggerLike} */
	logWarn = () => { };
	/** @type {LoggerLike} */
	logFatal = () => { };
	/** @type {LoggerLike} */
	logMark = () => { };



	/** @type {Object<string, WockEventHandle[]>} */
	mapHandles = {
		$error: [
			(wock, event) => this.logError(
				T('Occur.error', {
					reason: event?.error?.message
						?? event?.error
						?? event
						?? T('unknownReason'),
				}),
				event?.error?.stack ?? undefined,
			),
		],
		$close: [
			(wock, event) => this.logTrace(
				T('Occur.close', {
					reason: event?.reason || T('unknownReason'),
					code: event?.code ?? T('unknownCode'),
				})
			),
			() => {
				if(!this.isReopen) { return; }


				this.countReopen = 0;

				setTimeout(() => {
					this.countReopen++;
					this.countReopenAll++;


					this.open(T('reopen'), true);
				}, this.intervalReopen);
			},
		],
		$open: [
			(wock, reason) => this.logInfo(T('Occur.open', { address: this.url, reason })),
		],
		ping: [
			wock => wock.cast('pong'),
		],
	};
	/** @type {Object<string, WockEventHandle[]>} */
	mapHandlesOnce = {
		$error: [],
		$close: [],
		$open: [],
	};



	/** @type {WebSocket} */
	websocket;

	/** @type {boolean} */
	isOpened = false;
	/** @type {boolean} */
	isOpening = false;



	/** @type {number|NodeJS.Timeout} */
	idPingout;
	/** @type {number|NodeJS.Timeout} */
	idWaitout;
	/** @type {number} */
	countWaitout = 0;


	/** @type {number} */
	countReopen = 0;
	/** @type {number} */
	countReopenAll = 0;



	/**
	 * @param {string} url
	 * @param {WockOption} [option]
	 * @param {WebSocket} [webSocketExternal]
	 */
	constructor(url, option = {}, webSocketExternal = WebSocket) {
		this.url = url;


		this.WebSocket = webSocketExternal;


		this.isHeartbeat = hasOption('isHeartbeat', option) ? !!option.isHeartbeat : this.isHeartbeat;
		this.intervalPing = hasOption('intervalPing', option) ? Number(option.intervalPing) : this.intervalPing;
		this.intervalWait = hasOption('intervalWait', option) ? Number(option.intervalWait) : this.intervalWait;

		this.isReopen = hasOption('isReopen', option) ? !!option.isReopen : this.isReopen;
		this.intervalReopen = hasOption('intervalReopen', option) ? Number(option.intervalReopen) : this.intervalReopen;


		injectBaseLogger(this, Object.assign({ useNameLog: false }, option.logger));
	}



	/**
	 * reset heartbeat timeout
	 * @param {boolean} [isResetWaitout=true]
	 */
	resetHeartbeat(isResetWaitout = true) {
		clearTimeout(this.idPingout);
		clearTimeout(this.idWaitout);

		this.idPingout = null;
		this.idWaitout = null;

		if(isResetWaitout) { this.countWaitout = 0; }
	}

	/**
	 * send heartbeat message regularly
	 * @param {boolean} [isResetWaitout=true]
	 */
	checkHeartbeat(isResetWaitout = true) {
		this.resetHeartbeat(isResetWaitout);


		this.idPingout = setTimeout(() => {
			this.cast('ping');


			this.idWaitout = setTimeout(() => {
				this.countWaitout++;

				if(this.countWaitout >= 4) {
					this.websocket.close(4001, T('heartbeatTimeout'));
				}
				else {
					this.checkHeartbeat(false);
				}
			}, this.intervalWait);
		}, this.intervalPing);
	}



	/**
	 * @param {string} reason
	 * @param {boolean} isReopen
	 * @param {boolean} isThrowError
	 * @returns {Promise<Wock>}
	 */
	open(reason, isReopen = false, isThrowError = false) {
		if(this.isOpened || this.isOpening) { return; }

		this.isOpening = true;


		return new Promise((resolve, reject) => {
			const websocket = this.websocket = new this.WebSocket(this.url);


			let isPending = false;


			websocket.addEventListener('error', event => {
				if(!isPending && isThrowError) {
					isPending = true;

					reject(event?.error?.message ?? event?.error ?? event ?? T('unknownReason'));
				}


				this.emitAll({ type: '$error', data: [event] });
			});
			websocket.addEventListener('close', event => {
				this.isOpened = false;
				this.isOpening = false;


				this.resetHeartbeat();


				this.emitAll({ type: '$close', data: [event] });
			});

			websocket.addEventListener('message', async raw => {
				if(this.isHeartbeat) { this.checkHeartbeat(); }


				try {
					/** @type {WockEvent} */
					const event = JSON.parse(raw.data);

					this.emitAll(event);
				}
				catch(error) { void 0; }
			});

			websocket.addEventListener('open', () => {
				this.isOpened = true;
				this.isOpening = false;


				if(this.isHeartbeat) {
					this.checkHeartbeat();
				}


				this.emitAll({ type: '$open', data: [reason, isReopen, this.countReopen, this.countReopenAll] });

				isPending = true;
				resolve(this);
			});
		});
	}


	/**
	 * send a event to server
	 * @param {string} type
	 * @param {...any} [data]
	 * @returns {void}
	 */
	cast(type, ...data) {
		if(!type) { throw TypeError(T('ArgumentError.invalidType', { value: type }, 'Wock().cast')); }


		try {
			this.websocket.send(JSON.stringify({ type, data }));
		}
		catch(error) {
			if(typeof error?.message == 'string' && ~error.message.indexOf('CLOSED')) { return; }


			this.logError(T('Error.cast'), error.message ?? error, error.stack ?? undefined);
		}
	}


	/**
	 * @param {WockEvent} event
	 * @param {boolean} [isOnce=false]
	 * @returns {void}
	 */
	async emit(event = {}, isOnce = false) {
		const { type, data = [] } = event;
		if(!type) { return; }


		const mapHandles = isOnce ? this.mapHandlesOnce : this.mapHandles;
		const handles = mapHandles[type] ?? [];

		if(isOnce) {
			while(handles.length) {
				const handle = handles.shift();

				try {
					await handle(this, ...data);
				}
				catch(error) {
					this.logError(T('Error.eventOnce', { type }), error?.message ?? error ?? T('unknownReason'), error.stack ?? undefined);
				}
			}
		}
		else {
			for(const handle of handles) {
				if(!handle) { continue; }

				try {
					await handle(this, ...data);
				}
				catch(error) {
					this.logError(T('Error.event', { type }), error?.message ?? error ?? T('unknownReason'), error.stack ?? undefined);
				}
			}
		}
	}
	/**
	 * @param {WockEvent} event
	 * @returns {void}
	 */
	emitAll(event) {
		this.emit(event, true);

		this.emit(event);
	}


	/**
	 * add a handle of event
	 * @param {string} type
	 * @param {WockEventHandle} handle
	 * @param {boolean} [isOnce=false]
	 * @returns {void}
	 */
	add(type, handle, isOnce = false) {
		if(!type) { throw TypeError(T('ArgumentError.invalidType', { value: type }, 'Wock().add')); }
		if(typeof handle != 'function') { throw TypeError(T('ArgumentError.invalidHandle', { value: handle }, 'Wock().add')); }


		const mapHandles = isOnce ? this.mapHandlesOnce : this.mapHandles;

		(mapHandles[type] ?? (mapHandles[type] = [])).push(handle);
	}
	/**
	 * delete a handle of event
	 * @param {string} type
	 * @param {WockEventHandle} handle
	 * @param {boolean} [isOnce=false]
	 * @returns {void}
	 */
	del(type, handle, isOnce = false) {
		if(!type) { throw TypeError(T('ArgumentError.invalidType', { value: type }, 'Wock().del')); }
		if(typeof handle != 'function') { throw TypeError(T('ArgumentError.invalidHandle', { value: handle }, 'Wock().del')); }


		const mapHandles = isOnce ? this.mapHandlesOnce : this.mapHandles;

		const handles = mapHandles[type];
		if(!handles) { return; }

		const index = handles.indexOf(handle);
		if(!~index) { return; }

		handles.splice(index, 1);
	}
	/**
	 * get the handles of event
	 * @param {string} type
	 * @param {boolean} [isOnce=false]
	 * @returns {WockEventHandle[]}
	 */
	get(type, isOnce = false) {
		if(!type) { throw TypeError(T('ArgumentError.invalidType', { value: type }, 'Wock().get')); }


		const mapHandles = isOnce ? this.mapHandlesOnce : this.mapHandles;

		return mapHandles[type];
	}
	/**
	 * run the handles of event
	 * @param {string} type
	 * @param {boolean} [isOnce=false]
	 * @param {...any} [data]
	 */
	run(type, isOnce = false, ...data) {
		if(!type) { throw TypeError(T('ArgumentError.invalidType', { value: type }, 'Wock().run')); }


		this.emit({ type, data }, isOnce);
	}
	/**
	 * add a handle of event, and run it
	 * @param {string} type
	 * @param {WockEventHandle} handle
	 * @param {...any} [data]
	 */
	aun(type, handle, ...data) {
		if(!type) { throw TypeError(T('ArgumentError.invalidType', { value: type }, 'Wock().aun')); }


		this.add(type, handle);

		this.run(type, ...data);
	}
}



/** @type {Wock} */
export let $wock;
export const install = app => {
	$wock = new Wock(
		new URL('wock', location.origin).toString().replace(/^http/, 'ws'),
		{
			logInfo: (console || {}).log,
			logError: (console || {}).error,
		}
	);

	$wock.open($wock.TT('install'));

	app.config.globalProperties.$wock = $wock;
	app.provide('$wock', $wock);
};
