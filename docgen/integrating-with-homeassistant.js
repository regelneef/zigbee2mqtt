/**
 * This script generates the integrating-with-homeassistant page.
 */

const devices = require('zigbee-shepherd-converters').devices;
const HomeassistantExtension = require('../lib/extension/homeassistant');
const homeassistant = new HomeassistantExtension(null, null, null, null);
const YAML = require('json2yaml');

let template = `*NOTE: This file has been generated, do not edit this file manually!*

If you're hosting zigbee2mqtt using [this hassio addon-on](https://github.com/danielwelch/hassio-zigbee2mqtt) use their
documentation on how to configure.

The easiest way to integrate zigbee2mqtt with Home Assistant is by using
[MQTT discovery](https://www.home-assistant.io/docs/mqtt/discovery/).'


To achieve the best possible integration (including MQTT discovery):
- In your **zigbee2mqtt** \`configuration.yaml\` set \`homeassistant: true\`
- In your **Home Assistant** \`configuration.yaml\`:


\`\`\`yaml
mqtt:
  discovery: true
  broker: [YOUR MQTT BROKER]  # Remove if you want to use builtin-in MQTT broker
  birth_message:
    topic: 'hass/status'
    payload: 'online'
  will_message:
    topic: 'hass/status'
    payload: 'offline'
\`\`\`

Zigbee2mqtt is expecting Home Assistant to send it's birth/will messages to \`hass/status\`.
Be sure to add this to your \`configuration.yaml\` if you want zigbee2mqtt to resend the cached
values when Home Assistant restarts.


To respond to button clicks (e.g. WXKG01LM) you can use the following Home Assistant configuration:

\`\`\`yaml
automation:
  - alias: Respond to button clicks
    trigger:
      platform: mqtt
      topic: 'zigbee2mqtt/<FRIENDLY_NAME'
    condition:
      condition: template
      value_template: "{{ 'single' == trigger.payload_json.click }}"
    action:
      entity_id: light.bedroom
      service: light.toggle
\`\`\`

**When changing a \`friendly_name\` for a device you first have to start zigbee2mqtt and after that
restart Home Assistant in order to discover the new device ID.**

In case you **dont** want to use Home Assistant MQTT discovery you can use the configuration below.

[CONFIGURATION]
`;

const homeassistantConfig = (device) => {
    const payload = {
        platform: 'mqtt',
        state_topic: 'zigbee2mqtt/<FRIENDLY_NAME>',
        availability_topic: 'zigbee2mqtt/bridge/state',
        ...device.discovery_payload,
    };

    if (payload.command_topic) {
        if (payload.command_topic_prefix) {
            payload.command_topic = `zigbee2mqtt/<FRIENDLY_NAME>/${payload.command_topic_prefix}/set`;
        } else {
            payload.command_topic = `zigbee2mqtt/<FRIENDLY_NAME>/set`;
        }
    }

    delete payload.command_topic_prefix;

    let yml = YAML.stringify([payload]);
    yml = yml.replace(/(-) \n {4}/g, '- ');
    yml = yml.replace('---', `${device.type}:`);
    return yml;
};

let configuration = '';
devices.forEach((device) => {
    configuration += `### ${device.model}\n`;
    configuration += '```yaml\n';

    const configurations = homeassistant._getMapping()[device.model];

    if (configurations) {
        configurations.forEach((d, i) => {
            configuration += homeassistantConfig(d);
            if (configurations.length > 1 && i < configurations.length - 1) {
                configuration += '\n';
            }
        });

        configuration += '```\n\n';
    }
});


// Insert into template
template = template.replace('[CONFIGURATION]', configuration);

module.exports = template;
