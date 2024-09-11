import Api from "#core/api";
import { host, apiPort } from "./constants.js";

export default class ApiClient extends Api {
    constructor () {
        super( `ws://${ host }:${ apiPort }/?maxConnections=1` );
    }
}
