var regexXmlDeclaration = /^ *<\?xml .* \?>/;
var regexString = "^[ \t\r\n]*<[A-Za-z0-9:]+([ \t\r\n]+[A-Za-z0-9:]+[ \t\r\n]*=[ \t\r\n]*\"[^\"<>]*\")*[ \t\r\n]*\/*>";
var regExName = /^[A-Za-z0-9:]+/;
var regExProperties = /[A-Za-z0-9:]+[ \t\r\n]*=[ \t\r\n]*\"[^\"<>]*\"/g;

var camelCase = function(string) {
    if (_convertToCamelCase) {
        var newString = string[0].toLowerCase() + string.substr(1);
        return newString;
    }
    else {
        return string;
    }
};
var isNumber = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

var getJsonValue = function(rawString) {
    if (rawString === null) {
        return "null";
    }

    var lower = rawString.toLowerCase();
    if (lower === "true" || lower === "false") {
        return lower;
    }

    if (isNumber(rawString)) {
        return Number(rawString).toString();
    }

    var value = "\"" + rawString + "\"";
    return value;
};

var property = function(propertyString) {
    var index = propertyString.indexOf("=");
    this.name = propertyString.substring(0, index);
    var val = propertyString.substring(index+1);
    if (/^"/.test(val)) {
        val = val.substring(1);
    }
    if (/"$/.test(val)) {
        val = val.substring(0,val.length-1);
    }
    this.value = val;
};

var element = function(openingTag, localNamespace) {
    var removedBrackets = openingTag.replace("<","").replace("/>","").replace(">","").trim();
    this.raw = openingTag;
    
    var propArray = this.parseName(removedBrackets);
    this.isArray = false;
    this.isSelfClosing = /\/>$/.test(openingTag.trim());
    this.properties = new Array();
    this.body = (this.isSelfClosing) ? null : "";
    this.namespace = "";
    this.children = new Array();
    for (var i=0; i<propArray.length; i++) {
        var prop = new property(propArray[i]);
        if (prop.name.indexOf("xmlns") == 0) {
            nsindx = prop.name.indexOf(":");
            if (nsindx > 0) {
                var abbreviation = prop.name.substring(nsindx+1);
                element.namespaces[abbreviation] = prop.value;
            }
            else if (this.namespaceAbbreviation == "") {
                this.namespace = prop.value;
            }
        }
        else {
            this.properties.push(prop);
        }
    }
    this.closingTag = "<\/" + this.name + ">";
    if (this.namespaceAbbreviation != "") {
        this.closingTag = "<\/" + this.namespaceAbbreviation + ":" + this.name + ">";
        this.namespace = element.namespaces[this.namespaceAbbreviation];
    }
    else if (localNamespace && this.namespace == "") {
        this.namespace = localNamespace;
    }
};

element.prototype.parseName = function(openingTag) {
    var start = 0;
    
    if (!regExName.test(openingTag)) {
        throw new Error("Malformed XML at '" + tagString + "'");
    }
    var name = regExName.exec(openingTag)[0];
    var nsindx = name.indexOf(":");
    if (nsindx > 0) {
        this.namespaceAbbreviation = name.substring(0,nsindx);
        this.name = name.substring(nsindx+1);
    }
    else {
        this.namespaceAbbreviation = "";
        this.name = name;
    }
    
    var propArray = openingTag.match(regExProperties) || new Array();
    return propArray;
};

element.prototype.addChildElement = function(child) {
    this.children.push(child);
 };

element.processEntities = function(bodyString) {
    return bodyString.replace(/\&quot/g,"\"")
                        .replace(/\&amp/g,"&")
                        .replace(/\&apos/g,"'")
                        .replace(/\&lt/g,"<")
                        .replace(/\&gt/g,">");
};

element.prototype.processInnerElement = function(body) {
    var innerElements = deserializeXml(body, this.namespace);
    if (innerElements.length == 0) {
        if (element.cDataData && ~body.indexOf("$~$~") && element.cDataData[body]) {
            this.body = element.cDataData[body];
        }
        else {
            this.body = element.processEntities(body);
        }
    }
    else {
        for (var i=0; i<innerElements.length; i++) {
            this.addChildElement(innerElements[i]);
        }
    }
};

element.prototype.getBodyJson = function() {
    if (this.body == null) {
        return null;
    }
    //http://stackoverflow.com/questions/42068/how-do-i-handle-newlines-in-json
    return this.body.replace(/\\/g,"\\\\")
                    .replace(/\r/g,"\\\\r")
                    .replace(/\n/g,"\\\\n")
                    .replace(/\t/g,"\\\\t")
                    .replace(/\"/g,"\\\"");
};

element.cDataData = null;
element.namespaces = {};

element.prototype.renderProperties = function() {
    var properties = "";
    if (_groupPropertiesInCommonHash) {
        properties += "\"" + _groupPropertiesHashName + "\":{";
    }
    for (var i=0; i< this.properties.length; i++) {
        if (i > 0) properties += ",";
        var propValue = getJsonValue(this.properties[i].value);
        properties += "\"" + camelCase(this.properties[i].name) + "\":" + propValue;
    }
    properties += (_groupPropertiesInCommonHash) ?
                    "}," :
                    ",";
    return properties;
};

element.prototype.getUniqueListOfChildrenNames = function() {
    var arrayOfNames = new Array();
    for (var i=0; i< this.children.length; i++) {
        if (arrayOfNames.indexOf(this.children[i].name) < 0) {
            arrayOfNames.push(this.children[i].name);
        }
    }
    return arrayOfNames;
};
element.prototype.getGroupOfChildrenByName = function(name) {
    var arrayOfChildren = new Array();
    for (var i=0; i< this.children.length; i++) {
        if (this.children[i].name === name) {
            arrayOfChildren.push(this.children[i]);
        }
    }
    return arrayOfChildren;
};

element.prototype.renderChildren  = function(arrayNames) {
    var returnValue = "";
    var commaFlag = false;

    var arrayOfNames = this.getUniqueListOfChildrenNames();
    for (var i=0; i< arrayOfNames.length; i++) {
        var arrayOfChildren = this.getGroupOfChildrenByName(arrayOfNames[i]);
        if (arrayOfChildren.length > 1 || arrayNames.indexOf(arrayOfNames[i]) >= 0) {
            returnValue += (commaFlag ? ",":"") + "\"arrayOf" + arrayOfNames[i] + "\":[";
            for (var chil=0; chil<arrayOfChildren.length; chil++) {
                returnValue += (chil>0 ? "," : "") + arrayOfChildren[chil].renderElementValue(arrayNames);
            }
            returnValue += "]";
        }
        else {
            returnValue += (commaFlag ? ",":"") + arrayOfChildren[0].renderAsHash(arrayNames);
        }
        commaFlag = true;
    }
    return returnValue;
};

element.prototype.renderElementValue = function(arrayNames) {
    var returnValue = "{";
    if (_includeNamespaceInJson) {
        returnValue += "\"namespace\":\""+ this.namespace +"\",";
    }
    if (_includeNamespaceAbbreviationInJson) {
        returnValue += "\"namespaceAbbreviation\":\""+ this.namespaceAbbreviation +"\",";
    }
    if (_includeNameInJson) {
        returnValue += "\"name\":\"" + this.name + "\",";
    }
    returnValue += this.renderProperties();

    if (this.children.length === 0) {
        var body = getJsonValue(this.getBodyJson());
        returnValue += "\"value\":" + body + "}";
    }
    else {
        returnValue += this.renderChildren(arrayNames) + "}";
    }
    return returnValue;
};

element.prototype.renderAsHash = function(arrayNames) {
    var json = "\"" + camelCase(this.name) + "\":" + this.renderElementValue(arrayNames);
    return json;
 };


var deserializeXml = function(stringXml, localNamespace) {
    var elementArray = new Array();
    var startIndex = 0;
    while (startIndex < stringXml.length) {
        var regEx = new RegExp(regexString);
        
        var fatXml = stringXml.substring(startIndex);
        if (regEx.test(fatXml)) {
            var openingTag = regEx.exec(fatXml)[0];
            var ele2 = new element(openingTag, localNamespace);
            if (!ele2.isSelfClosing) {
                var regexEnd2 = new RegExp(ele2.closingTag);
                var endIndex2 = fatXml.search(regexEnd2);
                if (endIndex2 > 0) {
                    var endMatch2 = regexEnd2.exec(fatXml)[0];
                    var eleBody2 = fatXml.substring(openingTag.length, endIndex2);
                    ele2.processInnerElement(eleBody2);
                    startIndex += endIndex2 + endMatch2.length;
                }
                else {
                    throw new Error("Missing end tag for opening tag " + ele.name);
                }
            }
            else {
                startIndex += openingTag.length;
            }
            elementArray.push(ele2);
        }
        else {
            startIndex += stringXml.length;
        }
    }
    return elementArray;
};

var extractCData = function(stringXml) {
    var cDataData = {};
    var cDataLess = stringXml;
    var cDataStart = "<![CDATA[";
    var cDataEnd = "]]>";
    var counter = 1111;
    var index = cDataLess.indexOf(cDataStart);
    while (index >= 0) {
        index += cDataStart.length;
        var endIndex = cDataLess.indexOf(cDataEnd, index +1);
        var cdata = cDataLess.substring(index, endIndex);
        var key = "$~$~" + counter.toString();
        cDataData[key] = cdata;
        cDataLess = cDataLess.replace(cDataStart+cdata+cDataEnd,key);
        counter++;
        index = cDataLess.indexOf(cDataStart, index);
    }
    element.cDataData = cDataData;
    return cDataLess;
};

var removeDeclaration = function(stringXml) {
    if (regexXmlDeclaration.test(stringXml)) {
        var regExMatch = regexXmlDeclaration.exec(stringXml)[0];
        return (stringXml.substring(regExMatch.length));
    }
    return stringXml;
};

var getJson = function(elementArray, arrayNames) {
    var json = "";
    arrayNames = arrayNames || new Array();
    if (elementArray.length == 0) {
        //throw error?
    }
    else if (elementArray.length == 1) {
        json = "{" + elementArray[0].renderAsHash(arrayNames) + "}";
    }
    else {
        json = "[";
        for (var i = 0; i < elementArray.length; i++) {
            if (i > 0) json += ",";
            json += "{" + elementArray[i].renderAsHash(arrayNames) + "}";
        }
        json += "]";
    }
    return json;
};

var deserialize = function(stringXml) {
    var cleanXml = removeDeclaration(stringXml)
    cleanXml = extractCData(cleanXml)
                   .replace("\r","")
                   .replace("\n","")
                   .trim();
    return deserializeXml(cleanXml);
};

var _includeNamespaceInJson = false;
var includeNamespaceInJson = function(val) {
    if (val !== null) {
        _includeNamespaceInJson = val;
    }
    else {
        return _includeNamespaceInJson;
    }
};
var _includeNamespaceAbbreviationInJson = false;
var includeNamespaceAbbreviationInJson = function(val) {
    if (val !== null) {
        _includeNamespaceAbbreviationInJson = val;
    }
    else {
        return _includeNamespaceInJson;
    }
};
var _includeNameInJson = false;
var _groupPropertiesInCommonHash = true;
var _groupPropertiesHashName = "properties";
var _arrayPostfix = "Array";
var _autoDetectArray = true;
var _convertToCamelCase = true;
var convertToCamelCase = function(val) {
    if (val !== null) {
        _convertToCamelCase = val;
    }
    else {
        return _convertToCamelCase;
    }
};

module.exports = {
    property : property,
    element : element,
    deserialize : deserialize,
    getJson : getJson,
    convertToCamelCase : convertToCamelCase,
    includeNamespaceInJson : includeNamespaceInJson,
    includeNamespaceAbbreviationInJson : includeNamespaceAbbreviationInJson
};