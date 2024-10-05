import { host, apiPort } from "./constants.js";
import Api from "#core/api";

export default class ApiClient extends Api {
    constructor () {
        super( `ws://${ host }:${ apiPort }/?maxConnections=1` );
    }
}
