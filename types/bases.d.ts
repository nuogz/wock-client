import { LoggerOption } from '@nuogz/utility/types/src/inject-base-logger.pure.js';

import Wock from './index.js';



export type WockEvent = {
	type: string;
	data?: any;
};

export type WockEventHandle = (wock: Wock, ...data: any[]) => void | Promise<void>;

export type WocknOption = {
	name?: string | undefined;
	willHeartbeat?: boolean | undefined;
	intervalPing?: number | undefined;
	intervalWait?: number | undefined;
	/**
	 * - `undefined` for use `console` functions
	 * - `false` for close output
	 * - `Function` for output non-leveled logs
	 * - `{LogFunctions}` for leveled logs. The function will be called in the format of where, what and result. **ATTENTION** The Error instance will be passed in as one of the result arguments, not stringified error text.
	 */
	logger?: LoggerOption | undefined;
};
