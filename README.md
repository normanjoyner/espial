espial
======

##About

###Description
Espial is a distributed event layer, specifically written to be leveraged in nodejs applications.

By default, it uses multicast to find other nodes running Espial and automatically joins the existing cluster. Running in an environment which does not support multicast? Simply let Espial know, and it will perform manual peer discovery.

Espial exposes a standard set of events which can be listened for, such as the election of a new master, addition of a new node, removal of a node, as well as master promotion and demotion. It also allows applications to register custom events and respond to them. More on this below.

Ultimately, Espial was written to encourage the creation of highly available applications, without the need to run additional servers, such as a database, to share state. When your application needs to scale out, it performs auto-discovery to add the new nodes; no need to search for a list of peers. Simply fire messages from your application and let Espial handle the heavy lifting.

###Author
* Norman Joyner - <norman.joyner@gmail.com>

##Getting Started

###Installation
```npm install espial```

###Configuration

##Features

###Events
The following are core events provided by Espial. These events cannot be overwritten by custom user events.

* `listening` - emits when Espial has started
* `added_node` - emitted on exiting nodes when a new node enters the cluster
* `removed_node` - emitted on nodes when another node leaves the cluster
* `node_accepted` -  emitted on a new node if it was accepted to the cluster
* `node_rejected` - emitted on a new node if it was rejected from the cluster
* `new_master` - emits when a new master has been elected
* `promotion` - emits when this node is promoted to master
* `demotion` - emits when this node is demoted from master

Custom user events can be registered and listened for like any core event. To start listening for a specific event, call `espial.join("event_name")`. Similarly, when espial should no longer care about a custom event, simply remove the event listener by calling `espial.leave("event_name")`.

###Security
By default, any node can connect to an existing Espial cluster. Since this may not be desirable, filters can be enforced which require a connecting node to meet certain criteria, before being added to the cluster. After configuring your node, simply call ```espial.connection_filter()```, passing it a function which returns a boolean value. If the function returns true, the node is accepted, otherwise it is rejected. For example, the following filter will only accept nodes if their hostname ends with "org.internal":
```javascript
var Espial = require("espial");
var espial = new Espial();

espial.connection_filter(function(data){
    return data.host.match(/org.internal$/g) != null;
});
```

Once a node is connected to the cluster, Espial encrypts all traffic using 128-bit aes-gcm authenticated encryption. The aes key used is unique for each pair of nodes, and is generated using Diffie-Hellman key exchange upon connection. Initialization vectors are never reused. Since Espial does not require a pre-shared key to perform encryption, there is no fear of having that key compromised. Additionally, key rotation is made easy by simply restarting the node.
