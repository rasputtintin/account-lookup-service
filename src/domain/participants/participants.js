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
const Switch = require('../../model/switch')
const Enums = require('../../lib/enum')
const request = require('../../lib/request')
const participantEndpointCache = require('./cache/participantEndpoint')
const util = require('../../lib/util')
const Mustache = require('mustache')

/**
 * @function getParticipantsByTypeAndID
 *
 * @description sends request to applicable oracle based on type and sends results back to requester
 *
 * @param {string} requesterName The FSPIOP-Source fsp id
 * @param {object} req The request object from the Hapi server
 */
const getParticipantsByTypeAndID = async (requesterName, req) => {
  try {
    const type = req.params.Type
    if (Object.values(Enums.type).includes(type)) {
      let oracleEndpointModel
      if (req.query && req.query.currency && req.query.currency.length !== 0){
        oracleEndpointModel = await oracleEndpoint.getOracleEndpointByTypeAndCurrency(type, req.query.currency)
      } else {
        oracleEndpointModel = await oracleEndpoint.getOracleEndpointByType(type)
      }
      if (oracleEndpointModel) {
        const switchEndpoint = await Switch.getSwitchEndpointById(oracleEndpointModel[0].switchEndpointId)
        if (switchEndpoint) {
          const requesterParticipantModel = await validateParticipant(req.headers['fspiop-source'])
          if(requesterParticipantModel) {
            const url = oracleEndpointModel[0].value + req.raw.req.url
            const payload = req.payload || undefined
            const response = await request.sendRequest(url, req.headers, req.method, payload)
            if (response && response.body && Array.isArray(response.body.partyList) && response.body.partyList.length > 0) {
              const requesterEndpoint = await participantEndpointCache.getEndpoint(requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT, switchEndpoint.value)
              if (requesterEndpoint) {
                await request.sendRequest(requesterEndpoint, req.headers, Enums.restMethods.PUT, response.body)
              } else {
                await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
                  util.buildErrorObject(3201, 'Destination FSP does not exist or cannot be found.', [{
                    key: '',
                    value: ''
                  }]))
              }
            } else {
              await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
                util.buildErrorObject(3204, 'Party with the provided identifier, identifier type, and optional sub id or type was not found.', [{
                  key: '',
                  value: ''
                }]))
            }
          } else {
            Logger.error('Requester FSP not found')
            // TODO: handle issue where requester fsp not found
          }
        } else {
          Logger.error('Switch endpoint not found throw error to error handling framework')
          // TODO: Send to error handling framework
        }
      } else {
        await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
          util.buildErrorObject(3200, 'Oracle for provided type not found', [{key: '', value: ''}]))
      }
    } else {
      await util.sendErrorToErrorEndpoint(req, requesterName, Enums.endpointTypes.FSPIOP_CALLBACK_URL_PARTICIPANT_PUT_ERROR,
        util.buildErrorObject(3100, 'Type not found', [{key: '', value: ''}]))
    }
  } catch (e) {
    Logger.error(e)
  }
}

/**
 * @function putParticipantsErrorByTypeAndID
 *
 * @description This is a callback function
 *
 * @param {object} req The request object from the Hapi server
 */
const putParticipantsErrorByTypeAndID = async (req) => {
  try {
    const destinationParticipant = req.headers['fspiop-destination']
    // if (validateParticipant(destinationParticipant)) {
    //   const destinationEndpoint = await participantEndpointCache.getEndpoint(destinationParticipant, Enums.endpointTypes.FSPIOP_CALLBACK_URL)
    //   await request.sendRequest(destinationEndpoint, req.headers, Enums.restMethods.PUT, req.body)
    //   Logger.info(JSON.stringify(req))
    // } else {
    //
    // }
  } catch (e) {
    Logger.error(e)
  }
}

/**
 * @function postParticipantsBatch
 *
 * @description This sends request to all applicable oracles to store
 *
 * @param {object} req The request object from the Hapi server
 */
const postParticipantsBatch = async (req) => {
  try {
    const destinationParticipant = req.headers['fspiop-destination']
    // if (validateParticipant(destinationParticipant)) {
    //   const destinationEndpoint = await participantEndpointCache.getEndpoint(destinationParticipant, Enums.endpointTypes.FSPIOP_CALLBACK_URL)
    //   await request.sendRequest(destinationEndpoint, req.headers, Enums.restMethods.PUT, req.body)
    //   Logger.info(JSON.stringify(req))
    // } else {
    //
    // }
  } catch (e) {
    Logger.error(e)
  }
}


/**
 * @function validateParticipant
 *
 * @description sends a request to central-ledger to retrieve participant details and validate that they exist within the switch
 *
 * @param {string} fsp The FSPIOP-Source fsp id
 * @param {string} switchEndpoint The FSPIOP-Source fsp id
 */
const validateParticipant = async (fsp, switchEndpoint = undefined) => {
  if (!switchEndpoint){
    const switchEndpointModel = await Switch.getDefaultSwitchEndpoint()
    switchEndpoint = switchEndpointModel.value
  }
  const getParticipantUrl = Mustache.render(switchEndpoint + Enums.switchEndpoints.participantsGet, {fsp})
  const response = await request.sendRequest(getParticipantUrl, util.defaultHeaders(Enums.apiServices.CL, Enums.resources.participants, Enums.apiServices.ALS))
  if (response.statusCode !== 200) {
    return null
  } else {
    return response
  }
}

module.exports = {
  getParticipantsByTypeAndID,
  putParticipantsErrorByTypeAndID,
  validateParticipant,
  postParticipantsBatch
}