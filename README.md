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

    var ds = require("../lib/xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
```
Output:
```
{"root":{"childelement":{"someProp":"somevalue","value":"contents of child element"}}}
```

[More examples in the app.js test file.](https://github.com/ctigeek/NodeXmlDeserializer/blob/master/test/app.js)

Features:
* No schema or object definitions! Just send it XML and out comes JSON!
* Supports parsing of namespaces (but not JSON interpretation.)
* Supports CDATA, including special characters (newlines, etc).

Limitations:
* No support for streams. You must pass in the entire XML block in a string.
* The getJson method currently doesn't take namespaces into consideration. If your xml schema has duplicate names in different namespaces this may be an issue for you.
* The names of array elements must be included when instantiating the deserializer. This is the only information it needs prior to starting the process because it can't determine which elements will repeat during the parsing process. See app.js for an example.
* Only supports the 5 standard entities (quot, amp, apos, lt, gt). No support for custom defined entities... it will probably cause the parser to blow up.


