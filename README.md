NodeXmlDeserializer
===================
**NOTE**: The NPM package for this project is called [XmlDeserializer](https://npmjs.org/package/xmldeserializer).

Description: A simple and somewhat crude XML de-serializer package for Node.

*shut up and show me the code!*
```javascript
	var xml = "<root>";
    xml += "<childelement someProp=\"somevalue\">";
    xml += "contents of child element";
    xml += "</childelement>";
    xml += "</root>";

    var ds = require("xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
```
Output:
```javascript
{
  "root":{
	"properties" : {},
	"childelement":{
		properties : { "someProp":"somevalue" },
		"value":"contents of child element"}
	}
}
```

*Example showing an array and other edge cases.*
```javascript
	var xml = "<Root>";
    xml += "<ListOfItems ItemCategory=\"blue\">";
    xml += "<Item>lagoon</Item>";
    xml += "<Item>man group</Item>";
    xml += "<Item>christmas</Item>";
    xml += "<Item>light special</Item>";
    xml += "</ListOfItems>";
    xml += "<EmptyXmlNode foo=\"bar\" />";
	xml += "<XmlNodeWithEmptyValue></XmlNodeWithEmptyValue>";
    xml += "</Root>";

    var ds = require("xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
```
Output:
* Notice that the array is wrapped in its own hash named "arrayOfX", where X is the name of the XML node. 
* Also, to accomodate properties, each array item is its own hash.
* Last, notice that "EmtpyXmlNode is self-closing. Be definition its value is null.
* However if a node has a separate closing tag, but no value, then the value in the json will be an empty string.
```javascript
{
  "root":{
	"properties" : {},
	"listOfItems":{
		"properties" : { "itemCategory":"blue" },
		"arrayOfItem" : [
			{ "properties": {},
			  "value": "lagoon"
			},
			{ "properties": {},
			  "value": "man group"
			},
			{ "properties": {},
			  "value": "christmas"
			},
			{ "properties": {},
			  "value": "light special"
			}
		]
	},
	"emptyXmlNode" : {
		"properties" : { "foo":"bar" },
		"value": null
	},
	"xmlNodeWithEmptyValue" : {
		"properties": {},
		"value": ""
	}
  }
}
```


[More examples in the app.js test file.](https://github.com/ctigeek/NodeXmlDeserializer/blob/master/test/app.js)

Features:
* No schema or object definitions! Just send it XML and out comes JSON!
* Supports parsing of namespaces. You can (optionally) add the namespace or namespace abbreviation to the contents of the subsequent hash.
* Supports CDATA, including special characters (newlines, etc).
* Auto detects multiple element names and creates an array, or you can specify the node name to always be interpreted as an array.

Limitations:
* No support for streams. You must pass in the entire XML block in a string.
* XML properties must have values enclosed in quotes. e.g. <element prop="value"> (This means numeric and boolean property values aren't currently supported.) 
* The getJson method currently doesn't take namespaces into consideration. If your xml schema has duplicate names in different namespaces this may be an issue for you.
* Only supports the 5 standard entities (quot, amp, apos, lt, gt). No support for custom defined entities... it will probably cause the parser to blow up.


### Using xml deserializer with Express:
```javascript
var express = require("express");
var app = express();

// This will put the deserialized data into req.body for your route handlers to access.
app.use(function(req, res, next) {
    if (req.headers["content-type"] == "application/xml") {
        req.rawBody = "";
        req.setEncoding("utf8");
        req.on('data', function(chunk) { 
            req.rawBody += chunk;
        });
        req.on('end', function() {
            var elements = xmldeserializer.deserialize(req.rawBody);
            req.body = JSON.parse(xmldeserializer.getJson(elements));
            next();
        });
    }
    else {
        next();
    }
});

```
