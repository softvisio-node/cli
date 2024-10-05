import Api from "#core/api";

import { apiPort, host } from "./constants.js";

export default class ApiClient extends Api {
    constructor () {
        super( `ws://${ host }:${ apiPort }/?maxConnections=1` );
    }
}
