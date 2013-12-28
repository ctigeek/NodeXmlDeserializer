
var xml = "<root asdf=\"wer\"><firstObject prop=\"blah\"/><someObject prop=\"someproperty\">some value</someObject></root> ";
var json = {root: { asdf:"wer", firstObject: { prop:"blah" }, someObject: { prop:"someproperty", value:"some value" }}};

var xml2 = "<root><arrayOfStuff><item>qwe</item><item>zxv</item><item>tttt</item><specialItem>poiuyt</specialItem></arrayOfStuff></root>";
var json2 = {root: { arrayOfStuff: { arrayOf_item:["qwe","zxv","tttt"], specialItem:"poiuyt" } } };

var xmlDefaultNS = "<root xmlns=\"http://blahblah.com/somenamespace\"><element someprop=\"somevalue\"/></root>";

var xmlMultiNS = "<ns1:root xmlns:ns1=\"http://blahblah.com/ns1\"><ns1:element someprop=\"somevalue\"/><ns2:element xmlns:ns2=\"http://blahblah.com/ns2\">element body</ns2:element></ns1:root>";

//var xmlCdataExample = "<root><element><![CDATA[ This is data!\r\n data data data!  ]]></element></root>";

//var elements = extractElements(xml2);
//var json = elements[0].getJson(new Array("item"));
///console.log(json);

var ds = require("../lib/XmlDeserializer");
var deserializer = new ds.deserializer(null);
var elements = deserializer.deserialize(xmlMultiNS);
var json = deserializer.getJson( elements);

//var str = "{\"root\":{\"arrayOfStuff\":{\"specialItem\":{\"value\":\"poiuyt\"},\"arrayOf_item\":[\"qwe\",\"zxv\",\"tttt\"]}}}";

//var str = "{\"root\":{\"arrayOfStuff\":\"blah\", \"morestuff\":\"asdf\"}}";
//str = "{\"root\":5}";

//var str = "{\"root\":{\"element\":{\"value\":\" This is data! \\r\\n \\\" data data data!  \"}}}"

//var str = "{\"root\":{\"element\":{\"value\":\" \" asdf  !!!! \"}}}"

var jsonObject = JSON.parse(json);
console.log(JSON.stringify( jsonObject, null, 4));
console.log("done!");