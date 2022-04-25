import { createServer, Model, Response } from 'miragejs'

let server = null

// helper function for random and random value in array
const r = (n) => parseInt(Math.random() * n)
const rpick = (l) => l[parseInt(r(l.length))]

// TODO alot of this can be parsed from OpenAPI definitions
export default function MockAPI() {
  if (server) {
    return server
  }

  server = createServer({
    models: {
      devices: Model,
      zones: Model,
      dnsblocklist: Model,
      dnsoverride: Model,
      dnslogprivacylist: Model,
      dnslogdomainignorelist: Model,
      wireguardpeer: Model,
      plugin: Model,
      forwardrule: Model,
      blocksrc: Model,
      blockdst: Model
    },
    seeds(server) {
      server.create('device', {
        Name: 'rpi4',
        MAC: '11:11:11:11:11:11',
        WGPubKey: 'pubkey',
        VLANTag: 'vlantag',
        RecentIP: '192.168.2.101',
        PSKEntry: {
          Type: 'sae',
          Psk: 'password'
        },
        Zones: ['lan', 'dns'],
        DeviceTags: ['private']
      })

      server.create('device', {
        Name: 'rpi23',
        MAC: '22:22:22:22:22:22',
        WGPubKey: 'pubkey',
        VLANTag: 'vlantag',
        RecentIP: '192.168.2.102',
        PSKEntry: {
          Type: 'wpa2',
          Psk: 'password'
        },
        Zones: ['lan', 'dns'],
        DeviceTags: ['private']
      })

      for (let i = 3; i < 10; i++) {
        server.create('device', {
          Name: `device-${i}`,
          MAC: Array(6).fill(`${i}${i}`).join(':'),
          WGPubKey: 'pubkey',
          VLANTag: 'vlantag',
          RecentIP: `192.168.2.10${i}`,
          PSKEntry: {
            Type: rpick(['wpa2', 'sae']),
            Psk: `password${i}`
          },
          Zones: ['lan', 'dns'],
          DeviceTags: ['private']
        })
      }

      server.create('zone', { Name: 'lan', disabled: false, ZoneTags: [] })
      server.create('zone', { Name: 'wan', disabled: false, ZoneTags: [] })
      server.create('zone', { Name: 'dns', disabled: false, ZoneTags: [] })

      server.create('plugin', {
        Name: 'dns-block',
        URI: 'dns/block',
        UnixPath: '/state/dns/dns_block_plugin',
        Enabled: true
      })
      server.create('plugin', {
        Name: 'dns-log',
        URI: 'dns/log',
        UnixPath: '/state/dns/dns_log_plugin',
        Enabled: true
      })
      server.create('plugin', {
        Name: 'wireguard',
        URI: 'wireguard',
        UnixPath: '/state/wireguard/wireguard_plugin',
        Enabled: true
      })
      server.create('plugin', {
        Name: 'lookup',
        URI: 'lookup',
        UnixPath: '/state/plugin-lookup/lookup_plugin',
        Enabled: true
      })

      server.create('forwardrule', {
        SIface: 'wlan0',
        Protocol: 'tcp',
        SrcIP: '10.10.10.10',
        SrcPort: 22,
        DstIP: '192.168.2.101',
        DstPort: 22
      })
      server.create('forwardrule', {
        SIface: 'wlan0',
        Protocol: 'tcp',
        SrcIP: '',
        SrcPort: 80,
        DstIP: '192.168.2.101',
        DstPort: 80
      })

      server.create('blocksrc', {
        IP: '192.168.1.102',
        Port: 80,
        Protocol: 'tcp'
      })

      server.create('blockdst', {
        IP: '23.23.23.23',
        Port: 22,
        Protocol: 'tcp'
      })

      server.create('dnsblocklist', {
        URI: 'https://raw.githubusercontent.com/blocklistproject/Lists/master/ads.txt',
        Enabled: true
      })
      server.create('dnsblocklist', {
        URI: 'https://raw.githubusercontent.com/blocklistproject/Lists/master/youtube.txt',
        Enabled: false
      })
      server.create('dnsoverride', {
        Type: 'block',
        Domain: 'example.com.',
        ResultIP: '1.2.3.4',
        ClientIP: '192.168.2.101',
        Expiration: 0
      })

      server.create('dnsoverride', {
        Type: 'block',
        Domain: 'asdf.com.',
        ResultIP: '1.2.3.4',
        ClientIP: '*',
        Expiration: 0
      })

      server.create('dnsoverride', {
        Type: 'permit',
        Domain: 'google.com.',
        ResultIP: '8.8.8.8',
        ClientIP: '192.168.2.102',
        Expiration: 123
      })

      server.create('dnslogprivacylist', { ip: '192.168.1.1' })
      server.create('dnslogprivacylist', { ip: '192.168.1.101' })
      server.create('dnslogdomainignorelist', { domain: 'example.com' })
      server.create('dnslogdomainignorelist', { domain: 'privatedomain.com' })

      server.create('wireguardpeer', {
        PublicKey: 'QX9cpyIY7mh1kuVSBnRHJyyqnJQ6iuHdwqSPviPwdT8=',
        PresharedKey: 'YotzN+tIBiiY+q3FkjRM5nEHq0tXMX6c0tT7ls9516E=',
        AllowedIPs: '192.168.3.2/32',
        Endpoint: '192.168.2.1:51280',
        PersistentKeepalive: 25
      })

      server.create('wireguardpeer', {
        PublicKey: '2woVWXJcMcb/7Kh44bevC1eIQnbYBh9nDWyHc8LqWXY=',
        PresharedKey: '1HyPMEAITlOYoHBLvmYQV2qeWgM3Y5CPLDAZiBEl8HI=',
        AllowedIPs: '192.168.3.3/32',
        Endpoint: '192.168.2.1:51280',
        PersistentKeepalive: 25
      })
    },
    routes() {
      // TODO hook for all
      const authOK = (request) => {
        try {
          let [type, b64auth] = request.requestHeaders.Authorization.split(' ')
          return type == 'Basic' && atob(b64auth) == 'admin:admin'
        } catch (err) {
          return false
        }
      }

      this.get('/status', (schema, request) => {
        return authOK(request) ? '"Online"' : '"Error"'
      })

      this.get('/devices', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return schema.devices.all().models
      })

      this.put('/device/:id', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let MAC = request.params.id
        let dev = schema.devices.findBy({ MAC })
        let attrs = JSON.parse(request.requestBody)

        if (dev) {
          dev.update(attrs)
          return dev
        } else {
          let _dev = {
            MAC,
            Name: attrs.Name,
            PSKEntry: attrs.PSKEntry,
            Zones: [],
            DeviceTags: []
          }
          return schema.devices.create(_dev)
        }
      })

      this.get('/zones', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return schema.zones.all().models
      })

      this.del('/device/:id', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let id = request.params.id
        return schema.devices.findBy({ MAC: id }).destroy()
      })

      this.get('/pendingPSK', (schema, request) => {
        return false
      })

      this.get('/arp', (schema, request) => {
        return [
          {
            IP: '192.168.2.101',
            HWType: '0x1',
            Flags: '0x6',
            MAC: '11:11:11:11:11:11',
            Mask: '*',
            Device: 'wlan1.4096'
          },
          {
            IP: '192.168.2.102',
            HWType: '0x1',
            Flags: '0x6',
            MAC: '22:22:22:22:22:22',
            Mask: '*',
            Device: 'wlan1.4097'
          }
        ]
      })

      this.get('/nfmap/:id', (schema, request) => {
        let id = request.params.id
        if (id.match(/(lan|internet|dns|dhcp)_access/)) {
          return {
            nftables: [{}, { map: { elem: ['wifi0', 'eth0'], type: 'zz' } }]
          }
        }

        return {}
      })

      this.get('/ip/addr', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return [
          {
            ifindex: 1,
            ifname: 'eth0',
            flags: ['BROADCAST'],
            mtu: 0,
            qdisc: 'string',
            operstate: 'UP',
            group: 'default',
            txqlen: 1000,
            link_type: 'ether',
            address: '00:11:00:11:00:11',
            broadcast: 'ff:ff:ff:ff:ff:ff',
            addr_info: [
              {
                family: 'inet4',
                local: '192.168.0.1',
                prefixlen: 24,
                scope: 'global',
                valid_life_time: 4294967295,
                preferred_life_time: 'preferred_life_time'
              }
            ]
          },
          {
            ifindex: 2,
            ifname: 'wlan0',
            flags: ['BROADCAST'],
            mtu: 0,
            qdisc: 'string',
            operstate: 'UP',
            group: 'default',
            txqlen: 1000,
            link_type: 'ether',
            address: '11:22:33:44:55:66',
            broadcast: 'ff:ff:ff:ff:ff:ff',
            addr_info: [
              {
                family: 'inet4',
                local: '192.168.2.1',
                prefixlen: 24,
                scope: 'global',
                valid_life_time: 4294967295,
                preferred_life_time: 'preferred_life_time'
              }
            ]
          }
        ]
      })

      this.get('/iptraffic', (schema) => {
        const rIP = () => `${r(255)}.${r(255)}.${r(255)}.${r(255)}`
        const rInterface = () => rpick(['wlan0', 'wlan.4096', 'wlan.4097'])

        let ips = schema.devices.all().models.map((dev) => dev.RecentIP)

        let result = []
        for (let x = 0; x < 1024; x++) {
          let Interface = rInterface()
          let Src = rpick(ips)
          let Dst = ['wlan0'].includes(Interface) ? rpick(ips) : rIP()

          let row = {
            Interface,
            Src,
            Dst,
            Packets: r(4096),
            Bytes: r(1e6)
          }

          result.push(row)
        }

        return result
      })

      this.get('/traffic/incoming_traffic_wan', (schema) => {
        return [
          { IP: '192.168.2.101', Packets: 1796468, Bytes: 2203937574 },
          { IP: '192.168.2.102', Packets: 326682, Bytes: 417682716 }
        ]
      })

      this.get('/traffic/outgoing_traffic_wan', (schema) => {
        return [
          { IP: '192.168.2.101', Packets: 428534, Bytes: 62337288 },
          { IP: '192.168.2.102', Packets: 157634, Bytes: 20972708 }
        ]
      })

      this.get('/traffic/incoming_traffic_lan', (schema) => {
        return [
          { IP: '192.168.2.101', Packets: 1, Bytes: 84 },
          { IP: '192.168.2.102', Packets: 2, Bytes: 168 }
        ]
      })

      this.get('/traffic/outgoing_traffic_lan', (schema) => {
        return [
          { IP: '192.168.2.101', Packets: 4, Bytes: 336 },
          { IP: '192.168.2.102', Packets: 8, Bytes: 678 }
        ]
      })

      this.get('/traffic_history', (schema) => {
        const rSizeMB = (n = 1) => n * 1e6 + r(n) * r(1e6)
        const rSizekB = () => 1e3 + r(1e3)
        const rSizeb = () => r(1e3)
        const rSize = () => (r(2) ? rSizeMB() : rSizekB())

        let ips = schema.devices.all().models.map((dev) => dev.RecentIP)
        ips = ips.slice(0, 6)
        let result = []
        for (let x = 0; x < 1024; x++) {
          let serie = {}

          for (let ip of ips) {
            let small = [
              '192.168.2.103',
              '192.168.2.104',
              '192.168.2.105'
            ].includes(ip)

            let large = ['192.168.2.102'].includes(ip) && x > 100 && x < 500

            serie[ip] = {
              LanIn: r(4) % 4 ? 0 : rSizeb(),
              LanOut: rSizekB(),
              WanIn: small ? rSizekB() : rSizeMB(large ? 10 + r(100) : r(5)),
              WanOut: small ? rSizekB() : rSizeMB(r(5))
            }
          }

          result.push(serie)
        }

        return result
      })

      this.get('/hostapd/config', (schema) => {
        return '"testconfig"'
      })

      this.get('/hostapd/status', (schema) => {
        return {
          'ssid[0]': 'TestAP',
          channel: 36
        }
      })
      this.get('/hostapd/all_stations', (schema) => {
        return {
          '11:22:33:44:55:61': {
            AKMSuiteSelector: '00-0f-ac-2',
            aid: '3',
            capability: '0x11',
            connected_time: '4946',
            dot11RSNAStatsSTAAddress: '11:22:33:44:55:61',
            dot11RSNAStatsSelectedPairwiseCipher: '00-0f-ac-4',
            dot11RSNAStatsTKIPLocalMICFailures: '0',
            dot11RSNAStatsTKIPRemoteMICFailures: '0',
            dot11RSNAStatsVersion: '1',
            flags: '[AUTH][ASSOC][AUTHORIZED][WMM][HT]',
            hostapdWPAPTKGroupState: '0',
            hostapdWPAPTKState: '11',
            ht_caps_info: '0x016e',
            ht_mcs_bitmask: 'ff000000000000000000',
            inactive_msec: '1584',
            listen_interval: '1',
            rx_bytes: '126055',
            rx_packets: '2394',
            rx_rate_info: '60',
            signal: '-85',
            supported_rates: '8c 12 98 24 b0 48 60 6c',
            timeout_next: 'NULLFUNC POLL',
            tx_bytes: '485584',
            tx_packets: '1957',
            tx_rate_info: '1200 mcs 5 shortGI',
            vlan_id: '4247',
            wpa: '2'
          },
          '11:22:33:44:55:62': {
            AKMSuiteSelector: '00-0f-ac-2',
            aid: '3',
            capability: '0x11',
            connected_time: '4946',
            dot11RSNAStatsSTAAddress: '11:22:33:44:55:61',
            dot11RSNAStatsSelectedPairwiseCipher: '00-0f-ac-4',
            dot11RSNAStatsTKIPLocalMICFailures: '0',
            dot11RSNAStatsTKIPRemoteMICFailures: '0',
            dot11RSNAStatsVersion: '1',
            flags: '[AUTH][ASSOC][AUTHORIZED][WMM][HT]',
            hostapdWPAPTKGroupState: '0',
            hostapdWPAPTKState: '11',
            ht_caps_info: '0x016e',
            ht_mcs_bitmask: 'ff000000000000000000',
            inactive_msec: '1584',
            listen_interval: '1',
            rx_bytes: '126055',
            rx_packets: '2394',
            rx_rate_info: '60',
            signal: '-85',
            supported_rates: '8c 12 98 24 b0 48 60 6c',
            timeout_next: 'NULLFUNC POLL',
            tx_bytes: '485584',
            tx_packets: '1957',
            tx_rate_info: '1200 mcs 5 shortGI',
            vlan_id: '4247',
            wpa: '2'
          }
        }
      })

      // plugins
      this.get('/plugins', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return schema.plugins.all().models
      })

      this.put('/plugins/:name', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        let plugin = schema.plugins.findBy({ Name: attrs.Name })
        if (plugin) {
          plugin.update(attrs)
        } else {
          schema.plugins.create(attrs)
        }

        return schema.plugins.all().models
      })

      this.delete('/plugins/:name', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let Name = request.params.name
        schema.plugins.findBy({ Name }).destroy()
        return schema.plugins.all().models
      })

      //DNS plugin
      this.get('/plugins/dns/block/config', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return {
          BlockLists: schema.dnsblocklists.all().models,
          BlockDomains: schema.dnsoverrides.where({ Type: 'block' }).models,
          PermitDomains: schema.dnsoverrides.where({ Type: 'permit' }).models,
          ClientIPExclusions: null
        }
      })

      this.get('/plugins/dns/block/metrics', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return {
          TotalQueries: 65534,
          BlockedQueries: 4096,
          BlockedDomains: 1024
        }
      })

      this.get('/plugins/dns/block/blocklists', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return schema.dnsblocklists.all().models
      })

      this.put('/plugins/dns/block/blocklists', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.dnsblocklists.create(attrs)
      })

      this.delete('/plugins/dns/block/blocklists', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        let URI = attrs.URI
        return schema.dnsblocklists.findBy({ URI }).destroy()
      })

      this.put('/plugins/dns/block/override', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.dnsoverrides.create(attrs)
      })

      this.delete('/plugins/dns/block/override', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        let Domain = attrs.Domain
        return schema.dnsoverrides.findBy({ Domain }).destroy()
      })

      this.get('/plugins/dns/block/dump_domains', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return [
          '_thums.ero-advertising.com.',
          '0.fls.doubleclick.net.',
          '0.r.msn.com.',
          '0.start.bz.',
          '0.up.qingdaonews.com.'
        ]
      })

      this.get('/plugins/dns/log/config', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return {
          HostPrivacyIPList: schema.dnslogprivacylists.all().models,
          DomainIgnoreList: schema.dnslogdomainignorelists.all().models
        }
      })

      this.get('/plugins/dns/log/host_privacy_list', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return schema.dnslogprivacylists.all().models.map((d) => d.ip)
      })

      this.get('/plugins/dns/log/domain_ignores', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        return schema.dnslogdomainignorelists.all().models.map((d) => d.domain)
      })

      this.get('/plugins/dns/log/history/:ip', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let types = ['NOERROR', 'NODATA', 'OTHERERROR', 'BLOCKED']
        let ip = request.params.ip //192.168.2.101
        let revip = ip.split('').reverse().join('')
        let day = 1 + parseInt(Math.random() * 28)
        day = day.toString().padStart(2, '0')
        return [
          {
            Q: [
              {
                Name: `${revip}.in-addr.arpa.`,
                Qtype: 12,
                Qclass: 1
              }
            ],
            A: [
              {
                Hdr: {
                  Name: `${revip}.in-addr.arpa.`,
                  Rrtype: 12,
                  Class: 1,
                  Ttl: 30,
                  Rdlength: 0
                },
                Ptr: 'rpi4.lan.'
              }
            ],
            Type: 'NOERROR',
            FirstName: `${revip}.in-addr.arpa.`,
            FirstAnswer: 'rpi4.lan.',
            Local: '[::]:53',
            Remote: `${ip}:50862`,
            Timestamp: `2022-03-${day}T08:05:34.983138386Z`
          },
          {
            Q: [
              {
                Name: 'caldav.fe.apple-dns.net.',
                Qtype: 65,
                Qclass: 1
              }
            ],
            A: [],
            Type: 'NODATA',
            FirstName: 'caldav.fe.apple-dns.net.',
            FirstAnswer: '',
            Local: '[::]:53',
            Remote: `${ip}:50216`,
            Timestamp: `2022-03-${day}T08:05:34.01579228Z`
          },
          {
            Q: [
              {
                Name: `lb._dns-sd._udp.${revip}.in-addr.arpa.`,
                Qtype: 12,
                Qclass: 1
              }
            ],
            A: [],
            Type: 'OTHERERROR',
            FirstName: `lb._dns-sd._udp.${revip}.in-addr.arpa.`,
            FirstAnswer: '',
            Local: '[::]:53',
            Remote: `${ip}:64151`,
            Timestamp: `2022-03-${day}T08:05:29.976935196Z`
          }
        ]
      })

      this.get('/plugins/wireguard/peers', (schema, request) => {
        return schema.wireguardpeers.all().models
      })

      this.put('/plugins/wireguard/peer', (schema, request) => {
        // note prefer if the user generate the privkey & supply pubkey
        let attrs = JSON.parse(request.requestBody)

        const rKey = () => {
          let key = ''
          for (let i = 0; i < 32; i++) {
            key += String.fromCharCode(r(255))
          }

          return btoa(key)
        }

        let PublicKey = attrs.PublicKey || rKey()
        let PrivateKey = attrs.PublicKey ? '<PRIVATE KEY>' : rKey()

        let AllowedIPs = '192.168.3.4/32'
        if (attrs.AllowedIPs) {
          AllowedIPs = attrs.AllowedIPs
        } else {
          // get next free ip
          let ips = schema.wireguardpeers
            .all()
            .models.map((p) => p.AllowedIPs.replace(/\/.*/, ''))

          for (let i = 4; i < 100; i++) {
            let ip = `192.168.3.${i}`
            if (!ips.includes(ip)) {
              AllowedIPs = `${ip}/32`
              break
            }
          }
        }

        let Address = AllowedIPs.replace(/\/32$/, '/24')

        let peer = {
          PublicKey,
          AllowedIPs,
          Endpoint: '192.168.2.1:51280',
          PersistentKeepalive: 25
        }

        schema.wireguardpeers.create(peer)

        //output

        return {
          Interface: {
            PrivateKey,
            Address,
            DNS: '1.1.1.1, 1.0.0.1'
          },
          Peer: {
            PublicKey: '5vazmq54exf62jfXWE9YQ/m8kjcCZPtQBpLib2W+1H4=',
            AllowedIPs: '0.0.0.0/0',
            Endpoint: '192.168.2.1:51280',
            PersistentKeepalive: 25
          }
        }
      })

      this.delete('/plugins/wireguard/peer', (schema, request) => {
        //let id = request.params.id
        let attrs = JSON.parse(request.requestBody)
        let PublicKey = attrs.PublicKey

        return schema.wireguardpeers.findBy({ PublicKey }).destroy()
      })

      this.get('/plugins/wireguard/status', (schema, request) => {
        let status = {
          wg0: {
            publicKey: '5vazmq54exf62jfXWE9YQ/m8kjcCZPtQBpLib2W+1H4=',
            listenPort: 51280,
            peers: {}
          }
        }

        for (let p of schema.wireguardpeers.all().models) {
          status.wg0.peers[p.PublicKey] = {
            presharedKey: p.PresharedKey,
            allowedIps: [p.AllowedIPs]
          }
        }

        return status
      })

      this.put('/plugins/wireguard/up', (schema, request) => {
        return true
      })

      this.put('/plugins/wireguard/down', (schema, request) => {
        return true
      })

      // nftables
      this.get('/nftables', (schema, request) => {
        return {
          nftables: [
            {
              metainfo: {
                version: '0.9.8',
                release_name: 'E.D.S.',
                json_schema_version: 1
              }
            },
            { table: { family: 'inet', name: 'filter', handle: 18 } },
            { table: { family: 'inet', name: 'nat', handle: 19 } },
            { table: { family: 'inet', name: 'mangle', handle: 20 } },
            { table: { family: 'ip', name: 'accounting', handle: 22 } }
          ]
        }
      })

      // firewall
      this.get('/firewall/config', (schema, request) => {
        return {
          ForwardingRules: schema.forwardrules.all().models,
          BlockSrc: schema.blocksrcs.all().models,
          BlockDst: schema.blockdsts.all().models
        }
      })

      this.put('/firewall/forward', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.forwardrules.create(attrs)
      })

      this.delete('/firewall/forward', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.forwardrules.where(attrs).destroy()
      })

      this.put('/firewall/blocksrc', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.blocksrcs.create(attrs)
      })

      this.delete('/firewall/blocksrc', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.blocksrcs.where(attrs).destroy()
      })

      this.put('/firewall/blockdst', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.blockdsts.create(attrs)
      })

      this.delete('/firewall/blockdst', (schema, request) => {
        if (!authOK(request)) {
          return new Response(401, {}, { error: 'invalid auth' })
        }

        let attrs = JSON.parse(request.requestBody)
        return schema.blockdsts.where(attrs).destroy()
      })
    }
  })

  try {
    if (jest !== undefined) {
      server.logging = false
    }
  } catch (err) {}

  return server
}
