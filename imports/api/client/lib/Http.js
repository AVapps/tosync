class HTTP {
    static parseHeaders(headerLines) {
        const headers = {};
        headerLines.forEach((line) => {
            const lineParts = line.split(/ *: */);
            headers[lineParts[0]] = lineParts[1];
        });
        return headers
    }

    static baseParser(rawInput) {
        const mainParts = rawInput.split('\r\n\r\n');
        const headersPart = mainParts[0];
        const payload = mainParts[1];

        const headerLines = headersPart.split('\r\n');
        const firsLine = headerLines.shift();

        const firstLineParts = firsLine.match(/(HTTP\/[\d.]+)\s+(\d{3})\s(.*)$/)
        const headers = HTTP.parseHeaders(headerLines);

        return {
            firstLineParts,
            headers,
            payload
        }
    }
}

class HTTPRequest extends HTTP {

    constructor(rawPacket) {
        super();

        const packet = HTTPRequest.parseRequest(rawPacket);
        this.method = packet.method;
        this.path = packet.path;
        this.httpVersion = packet.httpVersion;
        this.headers = packet.headers;
        this.payload = packet.payload;
    }

    toString() {
        let result = "";
        result += `${this.method} ${this.path} ${this.httpVersion}\r\n`;
        for (const header in this.headers)
            result += `${header}: ${this.headers[header]}\r\n`;
        result += '\r\n';
        result += this.payload;
        return result;
    }

    static parseRequest(rawReq) {
        const mainParts = HTTP.baseParser(rawReq);

        mainParts.method = mainParts.firstLineParts[0];
        mainParts.path = mainParts.firstLineParts[1];
        mainParts.httpVersion = mainParts.firstLineParts[2];

        delete mainParts.firstLineParts;
        return mainParts;
    }
}

class HTTPResponse extends HTTP {
    constructor(rawPacket) {
        super();

        const packet = HTTPRequest.parseRequest(rawPacket);
        this.httpVersion = packet.httpVersion;
        this.status = packet.statusCode;
        this.statusText = packet.statusMessgae;
        this.headers = packet.headers;
        this.payload = packet.payload;
    }

    toString() {
        let result = "";
        result += `${this.httpVersion} ${this.status} ${this.statusText}\r\n`;
        for (const header in this.headers)
            result += `${header}: ${this.headers[header]}\r\n`;
        result += '\r\n';
        result += this.payload;
        return result;
    }

    static parseResponse(rawRes) {
        const mainParts = HTTP.baseParser(rawRes);

        if (mainParts.firstLineParts && mainParts.firstLineParts.length >= 4) {
          mainParts.httpVersion = mainParts.firstLineParts[1];
          mainParts.status = mainParts.firstLineParts[2];
          mainParts.statusText = mainParts.firstLineParts[3];
        } else {
          throw new Error("Can't parse response !", { rawRes, mainParts })
        }

        delete mainParts.firstLineParts;
        return mainParts;
    }
}

export { HTTP, HTTPRequest, HTTPResponse }
