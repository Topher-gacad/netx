import type { BootcampModule } from '../types.js';

export const module03: BootcampModule = {
  id: 'module-03',
  number: 3,
  title: 'IP Addressing & Subnetting',
  description: 'IPv4 structure, subnet masks, subnetting math, private vs public IPs.',
  color: '#4488ff',
  tier: 'silver',
  prerequisites: ['module-02'],
  labIds: ['lab-02-ip-addressing', 'lab-03-subnetting'],
  lessons: [
    {
      id: 'm03-l01',
      title: 'IPv4 Address Structure',
      order: 1,
      type: 'theory',
      estimatedMinutes: 8,
      content: {
        sections: [
          { type: 'heading', level: 1, text: 'IPv4 Address Structure' },
          { type: 'paragraph', text: 'Every device on a network needs a unique address — an IP address. IPv4 addresses are 32 bits long, written as four numbers separated by dots (dotted decimal notation).' },
          { type: 'analogy', text: 'An IP address is like a home address. "192.168.1.10" tells the network exactly where to deliver data, just like "123 Main Street" tells the mailman where to deliver a letter.' },
          { type: 'heading', level: 2, text: 'Format' },
          { type: 'paragraph', text: 'An IPv4 address has 4 octets (8 bits each = 32 bits total). Each octet ranges from 0 to 255.' },
          { type: 'code-block', code: '  192  .  168  .  1    .  10\n  │       │       │       │\n  Octet1  Octet2  Octet3  Octet4\n  8 bits  8 bits  8 bits  8 bits  = 32 bits total' },
          { type: 'heading', level: 2, text: 'Binary Representation' },
          { type: 'paragraph', text: 'Computers see IP addresses in binary (1s and 0s). You need to understand binary for subnetting.' },
          { type: 'code-block', code: '  192.168.1.10 in binary:\n  11000000.10101000.00000001.00001010\n\n  Common values to memorize:\n  128 = 10000000    192 = 11000000\n  64  = 01000000    224 = 11100000\n  32  = 00100000    240 = 11110000\n  16  = 00010000    248 = 11111000\n  0   = 00000000    255 = 11111111' },
          { type: 'heading', level: 2, text: 'Two Parts of an IP Address' },
          { type: 'diagram', diagram: { type: 'subnet-visual', data: { ip: '192.168.1.10', cidr: 24 }, caption: '192.168.1.10/24 — The first 3 octets are Network (blue), the last octet is Host (red)' } },
          { type: 'key-term', term: 'Network Portion', definition: 'Identifies which network the device belongs to. Like the street name in a home address.' },
          { type: 'key-term', term: 'Host Portion', definition: 'Identifies the specific device on that network. Like the house number.' },
          { type: 'callout', variant: 'key-concept', text: 'The subnet mask determines where the network portion ends and the host portion begins. This is the single most important concept in IP addressing.' },
        ],
      },
    },
    {
      id: 'm03-l02',
      title: 'Subnet Masks Explained',
      order: 2,
      type: 'theory',
      estimatedMinutes: 10,
      content: {
        sections: [
          { type: 'heading', level: 1, text: 'Subnet Masks — The Dividing Line' },
          { type: 'paragraph', text: 'A subnet mask tells the device: "This part is the network, this part is the host." It is always paired with an IP address.' },
          { type: 'heading', level: 2, text: 'Common Subnet Masks' },
          { type: 'comparison-table', headers: ['Mask', 'CIDR', 'Binary', 'Network Bits', 'Host Bits', 'Hosts per Subnet'], rows: [
            ['255.0.0.0', '/8', '11111111.00000000.00000000.00000000', '8', '24', '16,777,214'],
            ['255.255.0.0', '/16', '11111111.11111111.00000000.00000000', '16', '16', '65,534'],
            ['255.255.255.0', '/24', '11111111.11111111.11111111.00000000', '24', '8', '254'],
            ['255.255.255.128', '/25', '11111111.11111111.11111111.10000000', '25', '7', '126'],
            ['255.255.255.192', '/26', '11111111.11111111.11111111.11000000', '26', '6', '62'],
            ['255.255.255.224', '/27', '11111111.11111111.11111111.11100000', '27', '5', '30'],
            ['255.255.255.240', '/28', '11111111.11111111.11111111.11110000', '28', '4', '14'],
            ['255.255.255.252', '/30', '11111111.11111111.11111111.11111100', '30', '2', '2'],
          ] },
          { type: 'callout', variant: 'key-concept', text: '/24 (255.255.255.0) is the most common subnet mask. It gives you 254 usable host addresses — perfect for most LANs.' },
          { type: 'heading', level: 2, text: 'How to Read It' },
          { type: 'code-block', code: '  IP:   192.168.1.10\n  Mask: 255.255.255.0  (/24)\n\n  Network: 192.168.1.0    (first 24 bits = network)\n  Host:    .10             (last 8 bits = host)\n  Broadcast: 192.168.1.255 (all host bits = 1)\n  Usable range: 192.168.1.1 - 192.168.1.254' },
          { type: 'callout', variant: 'warning', text: 'Two addresses are always reserved: the network address (.0) and the broadcast address (.255 for /24). You CANNOT assign these to devices.' },
        ],
      },
    },
    {
      id: 'm03-l02b',
      title: 'Network, Host, and Broadcast — The 3 Key Addresses',
      order: 3,
      type: 'theory',
      estimatedMinutes: 12,
      content: {
        sections: [
          { type: 'heading', level: 1, text: 'Network Address, Host Address, and Broadcast Address' },
          { type: 'paragraph', text: 'Every subnet has THREE types of addresses. Understanding the difference is the foundation of all networking. Get this wrong and nothing works.' },
          { type: 'analogy', text: 'Think of a street called "Oak Lane" with houses numbered 1-254. The STREET NAME is the network address. Each HOUSE NUMBER is a host address. A MEGAPHONE that shouts to every house on the street is the broadcast address.' },

          { type: 'heading', level: 2, text: 'What is /24 (CIDR Notation)?' },
          { type: 'paragraph', text: 'You see /24 written after IP addresses all the time. It means "the first 24 bits are the network part." Let us break it down:' },
          { type: 'code-block', code: '  /24 means:\n  - Subnet mask: 255.255.255.0\n  - First 24 bits = NETWORK (fixed, same for all devices on this subnet)\n  - Last 8 bits = HOST (unique per device)\n\n  /24 in binary:\n  11111111.11111111.11111111 . 00000000\n  ←── network (24 bits) ──→   ←host (8)→' },
          { type: 'callout', variant: 'key-concept', text: 'The number after the / tells you how many bits are for the NETWORK. The remaining bits are for HOSTS. /24 = 24 network bits, 8 host bits. /16 = 16 network bits, 16 host bits. /30 = 30 network bits, 2 host bits.' },

          { type: 'heading', level: 2, text: 'Common CIDR Notations' },
          { type: 'comparison-table', headers: ['CIDR', 'Mask', 'Host Bits', 'Usable Hosts', 'Typical Use'], rows: [
            ['/8', '255.0.0.0', '24', '16,777,214', 'Huge networks (10.0.0.0/8)'],
            ['/16', '255.255.0.0', '16', '65,534', 'Large campus (172.16.0.0/16)'],
            ['/24', '255.255.255.0', '8', '254', 'Standard LAN (most common)'],
            ['/25', '255.255.255.128', '7', '126', 'Half a /24'],
            ['/26', '255.255.255.192', '6', '62', 'Small department'],
            ['/27', '255.255.255.224', '5', '30', 'Small team'],
            ['/28', '255.255.255.240', '4', '14', 'Very small group'],
            ['/30', '255.255.255.252', '2', '2', 'Router-to-router link'],
            ['/32', '255.255.255.255', '0', '1', 'Single host (loopback)'],
          ] },

          { type: 'heading', level: 2, text: 'The Three Addresses — Explained with Examples' },
          { type: 'paragraph', text: 'For the network 192.168.1.0/24:' },

          { type: 'heading', level: 2, text: '1. Network Address (the "street name")' },
          { type: 'key-term', term: 'Network Address: 192.168.1.0', definition: 'All host bits set to 0. Identifies the subnet itself. You CANNOT assign this to a device. It is the name of the network.' },
          { type: 'code-block', code: '  192.168.1.0 in binary:\n  11000000.10101000.00000001 . 00000000\n  ←──── network part ──────→   ←all zeros→\n\n  The host portion is all zeros = this is the NETWORK address.' },

          { type: 'heading', level: 2, text: '2. Host Addresses (the "house numbers")' },
          { type: 'key-term', term: 'Host Range: 192.168.1.1 — 192.168.1.254', definition: 'Any address where the host bits are NOT all zeros and NOT all ones. These are the addresses you assign to PCs, servers, routers, etc.' },
          { type: 'code-block', code: '  First usable host: 192.168.1.1\n  11000000.10101000.00000001 . 00000001  (host = 1)\n\n  Example host:       192.168.1.100\n  11000000.10101000.00000001 . 01100100  (host = 100)\n\n  Last usable host:   192.168.1.254\n  11000000.10101000.00000001 . 11111110  (host = 254)' },

          { type: 'heading', level: 2, text: '3. Broadcast Address (the "megaphone")' },
          { type: 'key-term', term: 'Broadcast Address: 192.168.1.255', definition: 'All host bits set to 1. Sends data to EVERY device on the subnet. You CANNOT assign this to a device. Used by protocols like ARP and DHCP.' },
          { type: 'code-block', code: '  192.168.1.255 in binary:\n  11000000.10101000.00000001 . 11111111\n  ←──── network part ──────→   ←all ones→\n\n  The host portion is all ones = this is the BROADCAST address.' },

          { type: 'callout', variant: 'warning', text: 'NEVER assign the network address (.0) or broadcast address (.255 for /24) to a device. They are reserved. If you do, networking breaks.' },

          { type: 'heading', level: 2, text: 'Complete Example: 192.168.1.0/24' },
          { type: 'code-block', code: '  Network Address:    192.168.1.0     (cannot assign)\n  First Usable Host:  192.168.1.1     (assign to router/gateway)\n  ...hosts...         192.168.1.2 - 192.168.1.253\n  Last Usable Host:   192.168.1.254   (assign to last device)\n  Broadcast Address:  192.168.1.255   (cannot assign)\n  ─────────────────────────────────────────────────\n  Total IPs:          256  (2^8)\n  Usable Hosts:       254  (256 - 2 for network and broadcast)' },

          { type: 'heading', level: 2, text: 'Another Example: 10.0.0.0/8' },
          { type: 'code-block', code: '  Network Address:    10.0.0.0        (cannot assign)\n  First Usable Host:  10.0.0.1\n  Last Usable Host:   10.255.255.254\n  Broadcast Address:  10.255.255.255  (cannot assign)\n  ─────────────────────────────────────────────────\n  Usable Hosts:       16,777,214' },

          { type: 'heading', level: 2, text: 'Smaller Subnet Example: 192.168.1.0/26' },
          { type: 'code-block', code: '  /26 = 255.255.255.192\n  Subnet increment: 256 - 192 = 64\n\n  Subnet 1: 192.168.1.0/26\n    Network:   192.168.1.0\n    Hosts:     192.168.1.1 - 192.168.1.62\n    Broadcast: 192.168.1.63\n\n  Subnet 2: 192.168.1.64/26\n    Network:   192.168.1.64\n    Hosts:     192.168.1.65 - 192.168.1.126\n    Broadcast: 192.168.1.127\n\n  Subnet 3: 192.168.1.128/26\n    Network:   192.168.1.128\n    Hosts:     192.168.1.129 - 192.168.1.190\n    Broadcast: 192.168.1.191\n\n  Subnet 4: 192.168.1.192/26\n    Network:   192.168.1.192\n    Hosts:     192.168.1.193 - 192.168.1.254\n    Broadcast: 192.168.1.255' },

          { type: 'heading', level: 2, text: 'How to Calculate Any Subnet' },
          { type: 'numbered-list', items: [
            'Write down the IP and CIDR (e.g., 172.16.10.50/28)',
            'Find the subnet mask: /28 = 255.255.255.240',
            'Find the increment: 256 - 240 = 16',
            'List subnet boundaries: .0, .16, .32, .48, .64, .80...',
            'Find which subnet 172.16.10.50 falls into: between .48 and .64 → subnet is 172.16.10.48',
            'Network = 172.16.10.48, First host = .49, Last host = .62, Broadcast = .63',
          ] },

          { type: 'callout', variant: 'tip', text: 'Quick trick: If the mask is /28 (240), the increment is 16. Just count by 16s: 0, 16, 32, 48, 64... Your IP falls in one of these ranges.' },

          { type: 'heading', level: 2, text: 'Why Does This Matter?' },
          { type: 'bullet-list', items: [
            'If two devices are on DIFFERENT subnets, they CANNOT communicate without a router',
            'Assigning the wrong subnet mask = devices think they are on different networks = no communication',
            'Every device on the same LAN must have the SAME network address and subnet mask',
            'The router (default gateway) must have an IP in the SAME subnet as the devices it serves',
          ] },
          { type: 'callout', variant: 'key-concept', text: 'The #1 troubleshooting check: Are both devices on the SAME subnet? Check IP + mask. If the network portions match → same subnet. If not → you need a router.' },
        ],
      },
    },
    {
      id: 'm03-l03',
      title: 'Subnetting Practice',
      order: 3,
      type: 'theory',
      estimatedMinutes: 12,
      content: {
        sections: [
          { type: 'heading', level: 1, text: 'Subnetting — Dividing Networks' },
          { type: 'paragraph', text: 'Subnetting means splitting one large network into smaller ones. Why? Efficiency, security, and organization.' },
          { type: 'analogy', text: 'A company has one building (network). Instead of everyone sharing one huge open floor, you divide it into departments (subnets): HR on floor 1, Engineering on floor 2, Sales on floor 3. Each floor is its own subnet.' },
          { type: 'heading', level: 2, text: 'Subnetting Steps' },
          { type: 'numbered-list', items: [
            'Start with the original network (e.g., 192.168.1.0/24)',
            'Decide how many subnets you need',
            'Borrow bits from the host portion to create subnets',
            'Calculate: new subnet mask, network addresses, broadcast addresses, usable ranges',
          ] },
          { type: 'heading', level: 2, text: 'Example: Split 192.168.1.0/24 into 4 subnets' },
          { type: 'code-block', code: '  Need 4 subnets → borrow 2 bits (2² = 4)\n  New mask: /26 (255.255.255.192)\n  Each subnet has 62 usable hosts (2⁶ - 2)\n\n  Subnet 1: 192.168.1.0/26    (hosts: .1 - .62)\n  Subnet 2: 192.168.1.64/26   (hosts: .65 - .126)\n  Subnet 3: 192.168.1.128/26  (hosts: .129 - .190)\n  Subnet 4: 192.168.1.192/26  (hosts: .193 - .254)' },
          { type: 'heading', level: 2, text: 'Quick Formula' },
          { type: 'bullet-list', items: [
            'Number of subnets = 2^(borrowed bits)',
            'Hosts per subnet = 2^(remaining host bits) - 2',
            'Subnet increment = 256 - last non-zero octet of mask',
          ] },
          { type: 'callout', variant: 'tip', text: 'For /26: increment = 256 - 192 = 64. Subnets start at .0, .64, .128, .192.' },
        ],
      },
    },
    {
      id: 'm03-l04',
      title: 'Private vs Public IP Ranges',
      order: 4,
      type: 'theory',
      estimatedMinutes: 5,
      content: {
        sections: [
          { type: 'heading', level: 1, text: 'Private vs Public IP Addresses' },
          { type: 'paragraph', text: 'Not all IP addresses are routable on the internet. Some ranges are reserved for private use inside organizations.' },
          { type: 'heading', level: 2, text: 'Private Ranges (RFC 1918)' },
          { type: 'comparison-table', headers: ['Range', 'CIDR', 'Class', 'Addresses'], rows: [
            ['10.0.0.0 – 10.255.255.255', '10.0.0.0/8', 'Class A', '16.7 million'],
            ['172.16.0.0 – 172.31.255.255', '172.16.0.0/12', 'Class B', '1 million'],
            ['192.168.0.0 – 192.168.255.255', '192.168.0.0/16', 'Class C', '65,534'],
          ] },
          { type: 'callout', variant: 'key-concept', text: 'Private IPs are FREE and reusable. Every company uses them internally. They CANNOT be routed on the internet — you need NAT (Module 7) to translate them to public IPs.' },
          { type: 'heading', level: 2, text: 'Public IPs' },
          { type: 'paragraph', text: 'Everything else is public. Public IPs are globally unique and routable on the internet. Your ISP gives you a public IP. Websites, DNS servers, and cloud services all have public IPs.' },
          { type: 'heading', level: 2, text: 'Special Addresses' },
          { type: 'key-term', term: '127.0.0.1 (Loopback)', definition: 'Always refers to "this device." Used for testing. Ping 127.0.0.1 to test if TCP/IP is working.' },
          { type: 'key-term', term: '169.254.x.x (APIPA)', definition: 'Automatic Private IP. Assigned when DHCP fails. If you see this, your device cannot reach a DHCP server.' },
          { type: 'key-term', term: '0.0.0.0', definition: 'Means "any network" or "all networks." Used in default routes.' },
        ],
      },
    },
    {
      id: 'm03-l05',
      title: 'Static IP vs DHCP — How Devices Get Their IP',
      order: 5,
      type: 'theory',
      estimatedMinutes: 10,
      content: {
        sections: [
          { type: 'heading', level: 1, text: 'Static IP vs DHCP' },
          { type: 'paragraph', text: 'There are two ways a device gets an IP address: you manually type it in (static), or a server assigns one automatically (DHCP). Understanding when to use each is critical.' },

          { type: 'heading', level: 2, text: 'Static IP — You Assign It Manually' },
          { type: 'paragraph', text: 'You type the IP address, subnet mask, and gateway into the device. The IP never changes unless you change it.' },
          { type: 'code-block', code: '  Cisco CLI:\n  enable → conf t → int gi0/0\n  ip address 192.168.1.1 255.255.255.0\n  no shutdown\n\n  pfSense Web GUI:\n  Interfaces tab → LAN → IP = 192.168.1.1, Mask = 255.255.255.0\n\n  TP-Link Web GUI:\n  Internet tab → WAN IP = 203.0.113.10' },
          { type: 'callout', variant: 'key-concept', text: 'Use static IPs for: Routers, Switches, Servers, NAS, Printers, Firewalls — any device that other devices need to find at a predictable address.' },

          { type: 'heading', level: 2, text: 'DHCP — Automatic Assignment' },
          { type: 'paragraph', text: 'DHCP (Dynamic Host Configuration Protocol) automatically assigns IPs to devices when they connect. A DHCP server keeps a pool of available addresses and hands them out on request.' },
          { type: 'key-term', term: 'DHCP Server', definition: 'The device that assigns IPs. Can be a Cisco Router (ip dhcp pool), pfSense (DHCP tab), TP-Link (LAN/DHCP tab), or a dedicated server.' },
          { type: 'key-term', term: 'DHCP Pool', definition: 'The range of IPs the server can hand out. Example: 192.168.1.100 to 192.168.1.200 = 101 available addresses.' },
          { type: 'key-term', term: 'Lease Time', definition: 'How long a device keeps its assigned IP before it must renew. Default is usually 24 hours.' },

          { type: 'heading', level: 2, text: 'How DHCP Works — DORA' },
          { type: 'paragraph', text: 'When a device connects and requests an IP via DHCP, four messages are exchanged:' },
          { type: 'numbered-list', items: [
            'Discover — Device broadcasts: "Is there a DHCP server out there?"',
            'Offer — Server responds: "I can give you 192.168.1.105"',
            'Request — Device replies: "I will take 192.168.1.105 please"',
            'Acknowledge — Server confirms: "192.168.1.105 is yours for 24 hours"',
          ] },
          { type: 'callout', variant: 'tip', text: 'Remember DORA: Discover → Offer → Request → Acknowledge. This is a common exam question!' },

          { type: 'heading', level: 2, text: 'ipconfig Commands — Managing Your IP' },
          { type: 'paragraph', text: 'On Windows PCs (and in our simulator), use ipconfig to view and manage IP settings:' },
          { type: 'comparison-table', headers: ['Command', 'What It Does', 'When to Use'], rows: [
            ['ipconfig', 'Show current IP config', 'Quick check — "what is my IP?"'],
            ['ipconfig /all', 'Show detailed config', 'See everything: IP, mask, gateway, DNS, DHCP server'],
            ['ipconfig /release', 'Release (clear) current IP', 'Before switching networks or when DHCP pool changed'],
            ['ipconfig /renew', 'Request new IP from DHCP', 'After release, or to get a fresh IP from server'],
          ] },
          { type: 'code-block', code: '  Example workflow:\n\n  PC> ipconfig              ← Check current IP\n  IP Address: 192.168.1.105\n\n  (Admin changes DHCP pool on the server...)\n\n  PC> ipconfig /release     ← Clear the old IP\n  Releasing IP addresses...\n  Ethernet0: released 192.168.1.105\n\n  PC> ipconfig /renew       ← Get new IP from updated pool\n  IP address assigned by DHCP server:\n  IP Address: 192.168.1.50\n  Subnet Mask: 255.255.255.0\n  Default Gateway: 192.168.1.1' },

          { type: 'heading', level: 2, text: 'Where to Configure DHCP Servers' },
          { type: 'comparison-table', headers: ['Device', 'How to Configure DHCP', 'Method'], rows: [
            ['Cisco Router', 'ip dhcp pool LAN → network 192.168.1.0 255.255.255.0 → default-router 192.168.1.1', 'CLI'],
            ['pfSense', 'DHCP tab → Enable → Set range', 'Web GUI'],
            ['TP-Link', 'LAN/DHCP tab → Enable → Set pool start/end', 'Web GUI'],
          ] },

          { type: 'heading', level: 2, text: 'Static vs DHCP — Quick Decision Guide' },
          { type: 'comparison-table', headers: ['Device Type', 'Use Static?', 'Use DHCP?', 'Why'], rows: [
            ['Router/Firewall', '✅ Always', '❌ Never', 'Other devices use this as gateway — must be predictable'],
            ['Server/NAS', '✅ Always', '❌ Never', 'Clients connect to it by IP — must not change'],
            ['Printer', '✅ Usually', '⚠️ Sometimes', 'Print drivers point to IP — changing breaks printing'],
            ['PC/Laptop', '⚠️ Sometimes', '✅ Usually', 'DHCP is easier — hundreds of PCs, no manual config'],
            ['IP Phone', '❌ Rarely', '✅ Usually', 'Phones get IP + VLAN from DHCP options'],
          ] },

          { type: 'callout', variant: 'key-concept', text: 'Infrastructure devices (routers, servers, printers) = STATIC IP. User devices (PCs, laptops, phones) = DHCP. This is how every real network is designed.' },
        ],
      },
    },
    {
      id: 'm03-l06',
      title: 'Lab: IP Addressing',
      order: 6,
      type: 'lab',
      labId: 'lab-02-ip-addressing',
      estimatedMinutes: 10,
    },
    {
      id: 'm03-l07',
      title: 'Lab: Same Subnet Practice',
      order: 7,
      type: 'lab',
      labId: 'lab-03-subnetting',
      estimatedMinutes: 10,
    },
  ],
  quiz: {
    id: 'quiz-module-03',
    moduleId: 'module-03',
    passingScore: 70,
    questions: [
      {
        id: 'q03-01', text: 'How many bits are in an IPv4 address?',
        options: [
          { id: 'a', text: '8', correct: false },
          { id: 'b', text: '16', correct: false },
          { id: 'c', text: '32', correct: true },
          { id: 'd', text: '64', correct: false },
        ],
        explanation: 'IPv4 = 32 bits = 4 octets of 8 bits each. IPv6 is 128 bits.',
      },
      {
        id: 'q03-02', text: 'What is the subnet mask for /24?',
        options: [
          { id: 'a', text: '255.255.0.0', correct: false },
          { id: 'b', text: '255.255.255.0', correct: true },
          { id: 'c', text: '255.255.255.128', correct: false },
          { id: 'd', text: '255.0.0.0', correct: false },
        ],
        explanation: '/24 means 24 bits for network = 255.255.255.0. Each 255 = 8 bits of 1s.',
      },
      {
        id: 'q03-03', text: 'How many usable hosts does a /24 subnet provide?',
        options: [
          { id: 'a', text: '256', correct: false },
          { id: 'b', text: '255', correct: false },
          { id: 'c', text: '254', correct: true },
          { id: 'd', text: '252', correct: false },
        ],
        explanation: '2^8 - 2 = 254. Subtract 2 for the network address (.0) and broadcast address (.255).',
      },
      {
        id: 'q03-04', text: 'Which of these is a private IP address?',
        options: [
          { id: 'a', text: '8.8.8.8', correct: false },
          { id: 'b', text: '192.168.1.1', correct: true },
          { id: 'c', text: '203.0.113.50', correct: false },
          { id: 'd', text: '1.1.1.1', correct: false },
        ],
        explanation: '192.168.x.x is a private range (RFC 1918). 8.8.8.8, 203.0.113.50, and 1.1.1.1 are public.',
      },
      {
        id: 'q03-05', text: 'What does the subnet mask determine?',
        options: [
          { id: 'a', text: 'The speed of the network', correct: false },
          { id: 'b', text: 'Which part is network and which part is host', correct: true },
          { id: 'c', text: 'The MAC address', correct: false },
          { id: 'd', text: 'The default gateway', correct: false },
        ],
        explanation: 'The subnet mask divides the IP into network portion and host portion. 1-bits = network, 0-bits = host.',
      },
      {
        id: 'q03-06', text: 'If you subnet 192.168.1.0/24 into 4 subnets, what is the new mask?',
        options: [
          { id: 'a', text: '/25', correct: false },
          { id: 'b', text: '/26', correct: true },
          { id: 'c', text: '/27', correct: false },
          { id: 'd', text: '/28', correct: false },
        ],
        explanation: '4 subnets = 2^2. Borrow 2 bits from /24 → /26 (255.255.255.192).',
      },
      {
        id: 'q03-07', text: 'What is 127.0.0.1?',
        options: [
          { id: 'a', text: 'Default gateway', correct: false },
          { id: 'b', text: 'Broadcast address', correct: false },
          { id: 'c', text: 'Loopback address (localhost)', correct: true },
          { id: 'd', text: 'DHCP server', correct: false },
        ],
        explanation: '127.0.0.1 is the loopback address. It always refers to "this device" and is used for testing.',
      },
      {
        id: 'q03-08', text: 'Two devices have IPs 192.168.1.10/24 and 192.168.2.10/24. Can they communicate directly?',
        options: [
          { id: 'a', text: 'Yes, they are both 192.168.x.x', correct: false },
          { id: 'b', text: 'No, they are on different subnets', correct: true },
          { id: 'c', text: 'Only if connected to the same switch', correct: false },
          { id: 'd', text: 'Only on Tuesdays', correct: false },
        ],
        explanation: '192.168.1.0/24 and 192.168.2.0/24 are different subnets. A router is needed to forward traffic between them.',
      },
      {
        id: 'q03-09', text: '/30 gives how many usable hosts?',
        options: [
          { id: 'a', text: '4', correct: false },
          { id: 'b', text: '2', correct: true },
          { id: 'c', text: '6', correct: false },
          { id: 'd', text: '1', correct: false },
        ],
        explanation: '/30 = 2 host bits. 2^2 - 2 = 2 usable hosts. Perfect for point-to-point router links.',
      },
      {
        id: 'q03-10', text: 'What does APIPA (169.254.x.x) indicate?',
        options: [
          { id: 'a', text: 'Normal operation', correct: false },
          { id: 'b', text: 'The device could not reach a DHCP server', correct: true },
          { id: 'c', text: 'The device is a server', correct: false },
          { id: 'd', text: 'The cable is unplugged', correct: false },
        ],
        explanation: '169.254.x.x (APIPA) is auto-assigned when DHCP fails. It means the device tried to get an IP automatically but could not find a DHCP server.',
      },
      {
        id: 'q03-11', text: 'What does "ipconfig /release" do?',
        options: [
          { id: 'a', text: 'Shows the current IP configuration', correct: false },
          { id: 'b', text: 'Requests a new IP from the DHCP server', correct: false },
          { id: 'c', text: 'Clears the current IP address', correct: true },
          { id: 'd', text: 'Restarts the network adapter', correct: false },
        ],
        explanation: 'ipconfig /release clears the current IP. After releasing, use /renew to get a new IP from the DHCP server. Useful when the DHCP pool has changed.',
      },
      {
        id: 'q03-12', text: 'The four steps of DHCP are called DORA. What does DORA stand for?',
        options: [
          { id: 'a', text: 'Download, Open, Read, Apply', correct: false },
          { id: 'b', text: 'Discover, Offer, Request, Acknowledge', correct: true },
          { id: 'c', text: 'Deny, Offer, Renew, Accept', correct: false },
          { id: 'd', text: 'Detect, Organize, Route, Assign', correct: false },
        ],
        explanation: 'DORA: Discover (client broadcasts), Offer (server responds), Request (client accepts), Acknowledge (server confirms). This is the DHCP handshake.',
      },
      {
        id: 'q03-13', text: 'Which devices should have a static IP instead of DHCP?',
        options: [
          { id: 'a', text: 'Laptops and phones', correct: false },
          { id: 'b', text: 'Routers, servers, printers, NAS', correct: true },
          { id: 'c', text: 'All devices should use DHCP', correct: false },
          { id: 'd', text: 'Only the router', correct: false },
        ],
        explanation: 'Infrastructure devices (routers, servers, printers, NAS) need predictable IPs so other devices can always find them. User devices (PCs, laptops) use DHCP because they are many and don\'t need fixed addresses.',
      },
    ],
  },
  badge: {
    id: 'badge-module-03',
    name: 'IP Architect',
    description: 'Completed Module 3: IP Addressing & Subnetting',
    icon: '🔢',
    color: '#4488ff',
    tier: 'silver',
  },
};
