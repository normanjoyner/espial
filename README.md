espial
======

##About

###Description
Espial is a distributed event layer, specifically written to be leveraged in nodejs applications.

By default, it uses multicast to find other nodes running Espial and automatically joins the existing cluster. Running in an environment which does not support multicast? Simply let Espial know, and it will perform manual peer discovery.

Espial exposes a standard set of events which can be listened for, such as the election of a new master, addition of a new node, removal of a node, as well as master promotion and demotion. It also allows applications to register custom events and respond to them. More on this below.

Ultimately, Espial was written to encourage the creation of highly available applications, without the need to run additional servers, such as a database, to share state. When your application needs to scale out, it performs auto-discovery to add the new nodes; no need to search for a list of peers. Simply fire messages from your application and let Espial handle the heavy lifting.

###Author
* Norman Joyner - <norman@brandingbrand.com>

##Getting Started

###Installation
```npm install espial```

###Dependencies
```npm install```
