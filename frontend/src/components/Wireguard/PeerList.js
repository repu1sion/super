import React, { useState, useEffect, useRef } from 'react'

import { wireguardAPI } from 'api/Wireguard'
import WireguardAddPeer from 'components/Wireguard/WireguardAddPeer'
import ModalForm from 'components/ModalForm'
import { prettyDate, prettySize } from 'utils'
//import Toggle from 'components/Toggle'

import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table
} from 'reactstrap'

const PeerList = (props) => {
  const [peers, setPeers] = useState([])
  const refreshPeers = () => {
    /*wireguardAPI.peers().then((list) => {
      setPeers(list)
    })*/
    wireguardAPI.status().then((status) => {
      let list = []
      for (let publicKey in status.wg0.peers) {
        let p = status.wg0.peers[publicKey]
        let peer = {
          PublicKey: publicKey,
          AllowedIPs: p.allowedIps.join(','),
          LatestHandshake: p.latestHandshake
            ? new Date(p.latestHandshake * 1e3)
            : 0,
          TransferRx: p.transferRx || 0,
          TransferTx: p.transferTx || 0
        }

        list.push(peer)
      }

      setPeers(list)
    })
  }

  useEffect(() => {
    refreshPeers()
  }, [])

  const deleteListItem = (peer) => {
    wireguardAPI
      .deletePeer(peer)
      .then(refreshPeers)
      .catch((err) => {})
  }

  const refModal = useRef(null)

  return (
    <>
      <Card>
        <CardHeader>
          <ModalForm
            title="Add Wireguard peer"
            triggerText="add"
            triggerClass="pull-right"
            triggerIcon="fa fa-plus"
            modalRef={refModal}
          >
            <WireguardAddPeer notifyChange={refreshPeers} />
          </ModalForm>

          <CardTitle tag="h4">Wireguard peers</CardTitle>
        </CardHeader>
        <CardBody>
          <Table responsive>
            <thead className="text-primary">
              <tr>
                <th>AllowedIPs</th>
                <th>Pubkey</th>
                <th>Last active</th>
                <th>Transfer</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {peers.map((peer) => (
                <tr key={peer.AllowedIPs}>
                  <td>{peer.AllowedIPs}</td>
                  <td>{peer.PublicKey}</td>
                  <td>
                    {peer.LatestHandshake
                      ? prettyDate(peer.LatestHandshake)
                      : null}
                  </td>
                  <td>
                    {peer.TransferRx ? (
                      <>
                        {prettySize(peer.TransferRx)} /{' '}
                        {prettySize(peer.TransferTx)}
                      </>
                    ) : null}
                  </td>
                  <td className="text-center">
                    <Button
                      className="btn-icon"
                      color="danger"
                      size="sm"
                      type="button"
                      onClick={(e) => deleteListItem(peer)}
                    >
                      <i className="fa fa-times" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  )
}

export default PeerList
