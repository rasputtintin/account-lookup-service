/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-shared').Logger
const oracleEndpoint = require('../../model/oracle')
const Enums = require('../../lib/enum')
const request = require('../../lib/request')
const participantEndpointCache = require('./cache/participantEndpoint')


const participantsByTypeAndID = async (requesterName, req) => {
  try {
    const type = req.params.Type
    if (Object.values(Enums.type).includes(type)) {
      const requesterEndpoint = await participantEndpointCache.getEndpoint(requesterName, Enums.endpointTypes.FSIOP_CALLBACK_URL)
      const oracleEndointModel = await oracleEndpoint.getOracleEndpointByType(type)
      const url = oracleEndointModel.value + req.path
      const payload = req.payload || undefined
      const response = await request.requestOracleRegistry(url, req.headers, req.method, payload)
      const requesterResponse = await request.requestOracleRegistry(requesterEndpoint, req.headers, Enums.restMethods.PUT, response.body)
      Logger.info(JSON.stringify(response))
    } else {
      // TODO handle negative case when type not located
    }
  } catch (e) {
    Logger.error(e)
  }
}

module.exports = {
  participantsByTypeAndID
}