
var basicTest = function() {
    var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?> \r\n";
    xml += "<Root> \r\n";
    xml += "   <ChildElement SomeProp=\"somevalue\">";
    xml += "contents of child element";
    xml += "</ChildElement> \r\n";
    xml += "   <DiffChildElement SomeProp=\"somevalue\">";
    xml += "different contents of child element";
    xml += "</DiffChildElement> \r\n";
    xml += " </Root> ";

    var ds = require("../lib/xmldeserializer");
    ds.convertToCamelCase(false);
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
    var jsonObject = JSON.parse(jsonString);
    console.log(JSON.stringify( jsonObject, null, 4));
    console.log("done!");
};

var entitiesTest = function() {
    var xml = "<root>";
    xml += "<childelement someProp=\"somevalue\">";
    xml += " and I quote, &quot this is important &quot blahblahblah. less than &lt greater than &gt apostrophe &apos ampersand &amp ";
    xml += "</childelement>";
    xml += "</root>";

    var ds = require("../lib/xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
    var jsonObject = JSON.parse(jsonString);
    console.log(JSON.stringify( jsonObject, null, 4));
    console.log("done!");
};

var arrayTest = function() {
    var xml = "<Root>";
    xml += "<ListOfItems ItemCategory=\"blue\">";
    xml += "<Item>lagoon</Item>";
    xml += "<Item>man group</Item>";
    xml += "<Item>christmas</Item>";
    xml += "<Item>light special</Item>";
    xml += "</ListOfItems>";
    xml += "</Root>";

    var ds = require("../lib/xmldeserializer");
    ds.convertToCamelCase(true);
    var arrayOfArrayNames = new Array("Item");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements,arrayOfArrayNames);
    console.log(jsonString);
    var jsonObject = JSON.parse(jsonString);
    console.log(JSON.stringify( jsonObject, null, 4));
    console.log("done!");
};

var cDataTest = function() {
    var xml = "<root>";
    xml += "<element>";
    xml += "<![CDATA[ This is data!\r\n data data data! You can put special characters in here!\r\n\r\n Here's a quote: \" and here's a backslash: \\  ]]>";
    xml += "</element>";
    xml += "</root>";

    var ds = require("../lib/xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
    var jsonObject = JSON.parse(jsonString);
    console.log(JSON.stringify( jsonObject, null, 4));
    console.log("done!");
};

var defaultNamespaceTest = function() {
    var xml = "<root xmlns=\"http://blahblah.com/somenamespace\">";
    xml += "<element>";
    xml += "<![CDATA[ This is data!\r\n data data data! You can put special characters in here!\r\n\r\n Here's a quote: \" and a backslash: \\  ]]>";
    xml += "</element>";
    xml += "</root>";

    var ds = require("../lib/xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
    var jsonObject = JSON.parse(jsonString);
    console.log(JSON.stringify( jsonObject, null, 4));
    console.log("done!");
};

var namedNamespaceTest = function() {
    var xml = "<rt:root xmlns:rt=\"http://blahblah.com/somenamespace\">";
    xml += "<rt:element>";
    xml += "yadda yadda yadda";
    xml += "</rt:element>";
    xml += "</rt:root>";

    var ds = require("../lib/xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
    var jsonObject = JSON.parse(jsonString);
    console.log(JSON.stringify( jsonObject, null, 4));
    console.log("done!");
};

var multipleNamespaceTest = function() {
    var xml = "<rt:root xmlns:rt=\"http://blahblah.com/somenamespace\">";
    xml += "<rt2:element xmlns:rt2=\"http://blahblah.com/anothernamespace\">";
    xml += "yadda yadda yadda";
    xml += "</rt2:element>";
    xml += "</rt:root>";

    var ds = require("../lib/xmldeserializer");
    var elements = ds.deserialize(xml);
    var jsonString = ds.getJson(elements);
    console.log(jsonString);
    var jsonObject = JSON.parse(jsonString);
    console.log(JSON.stringify( jsonObject, null, 4));
    console.log("done!");
};


basicTest();
entitiesTest();
arrayTest();
cDataTest();
defaultNamespaceTest();
namedNamespaceTest();
multipleNamespaceTest();
console.log("done.");

