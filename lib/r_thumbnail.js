;(function ( $, window, document, undefined ) {
    var H = $("html") ;
    var W = $(window) ;
    var D = $(document) ;
    // Create the defaults once
    var pgn = 'r_thumbnail' ;
        defaultOptions = {  
            type: 'image',  //[base64, image, canvas, blob, arraybuffer, hex]
            size: '128x128',
            debug: false,
            videoOption: {
                sec: 10
            },
        } ;

    var msieversion = function() {

        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE ");

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))  // If Internet Explorer, return version number
        {
            return true ;
        }
        else  // If another browser, return 0
        {
            return false ;
        }

        return false;
    }
        
    var buf2hex = function(buffer) { // buffer is an ArrayBuffer
      //return Array.prototype.map.call(   new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)    ).join('');
      return Array.prototype.map.call(   new Uint8Array(buffer), function(x) {
        return ('00' + x.toString(16)).slice(-2) ;
      }).join('');
    }         
        
    var errorTable = {
        '4001': 'Your file is supported!',
    } ;
        
    function r_thumbnail() {
        
        var argu = arguments[0] ;
        this.target = argu[0] ;
        
        if (argu.length===2) {
            var _options = {} ;
            var callback = argu[1] ;
        }
        else if (argu.length===3) {
            var _options = argu[1] ;
            var callback = argu[2] ;
        }
        
        if (!this.target) return undefined ;
        
        if (!_options instanceof Object) _options = {} ;

        this.options = {} ;
        this.options = $.extend({}, defaultOptions, _options) ;
        this.data = {} ;  //for withData: true
        this.callback = callback ;

        this.parse() ;
    } ;

    r_thumbnail.prototype.parse = function() {
        var self = this ;

        var target = self.target ;

        if (target.type.match('image/')) {
            self.parseImg(target) ;
            return ;
        }
        
        if (target.type.match('video/')) {
            self.parseVideo(target) ;
            return ;
        }
        
        if (target.type.match('audio/')) {
            self.parseAudio(target) ;
            return ;
        }
        
        self.prepare2Callback() ;
    } ;
    
    r_thumbnail.prototype.showError = function(errorCode) {
        var self = this ;
        
        if (self.options.debug && errorTable[errorCode]) {
            alert(errorTable[errorCode]) ;
        }
        
    } ;
    
    r_thumbnail.prototype.parseAudio = function(file) {
        var self = this ;
        
        var parseAudioDurationByFile = function(file, okCallback) {
            
            var audio = new Audio() ;
            audio.onloadedmetadata = function() {
                okCallback(this.duration) ;
            } ;
            audio.onerror = function() {
                okCallback(0) ;
            } ;
            audio.src = URL.createObjectURL(file) ;
            
        } ;
        
        $['https://github.com/creeperyang/id3-parser'].parse(file)
            .then(function(resp) {

                self.data.album = resp.album || "" ;
                self.data.artist = resp.artist || "" ;
                self.data.genre = resp.genre || "" ;
                self.data.year = resp.year || "" ;
                
                if (resp.image && resp.image.data) {
                    self.parseBase64ByImgUrl(URL.createObjectURL(new Blob([resp.image.data], {type: resp.image.mime})), function okCallback(canvas) {
                        self.parseCanvas(canvas, function okCallback(result) {
                            if (self.options.withData) {

                                parseAudioDurationByFile(file, function(duration) {
                                    self.data.duration = duration || 0 ;
                                    self.prepare2Callback(result) ;
                                }) ;
                                
                            }
                            else {
                                self.prepare2Callback(result) ;
                            }
                        }) ;
                    }) ;
                }
                else {
                    if (self.options.withData) {

                        parseAudioDurationByFile(file, function(duration) {
                            self.data.duration = duration || 0 ;
                            self.prepare2Callback() ;
                        }) ;
                        
                    }
                    else {
                        self.prepare2Callback() ;
                    }
                }
            }) ;
        
    } ;
    
    r_thumbnail.prototype.parseVideo = function(file) {
        var self = this ;
        
        var $video = $('<video controls="" preload="auto" autoplay style="opacity:0;position:absolute;"><source></video>') ;
        //var $video = $('<video controls="" preload="auto" style="width:400px;height:400px;"><source></video>') ;
        var video = $video[0] ;
        var source = $video.find('source')[0] ;
        video.onseeked = function() {
            var video = this ;
            var rect = video.getClientRects()[0] ;
            self.data.width = rect.width || 0 ;
            self.data.height = rect.height || 0 ;
            self.data.duration = video.duration || 0 ;
            var canvas = document.createElement('canvas') ;
            var ctx = canvas.getContext('2d') ;
            var _size = self.options.size.split('x') ;
            canvas.width = _size[0] ;
            canvas.height = _size[1] ;
            
            if (msieversion()) {
                setTimeout(function() {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.width) ;
                    $video.remove() ;
                    self.parseCanvas(canvas, function okCallback(result) {
                        self.prepare2Callback(result) ;
                    }) ;
                }, 500) ;
            }
            else {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.width) ;
                $video.remove() ;
                self.parseCanvas(canvas, function okCallback(result) {
                    self.prepare2Callback(result) ;
                }) ;                
            }
        } ;
        
        video.onloadeddata = function() {
            var video = this ;
            video.currentTime = self.options.videoOption.sec ;
        } ;        

        $('body').append($video) ;
        source.src = URL.createObjectURL(file) ;
    } ;
    
    r_thumbnail.prototype.parseImg = function(file) {
        var self = this ;
        var reader = new FileReader() ;
        reader.onload = function() {
            self.parseBase64ByImgUrl(this.result, function okCallback(canvas) {
                self.parseCanvas(canvas, function okCallback(result) {
                    self.prepare2Callback(result) ;
                }) ;
            }) ;
        } ;
        reader.readAsDataURL(file) 
    } ;
    
    //imgUrl->base64URL、blobURL
    r_thumbnail.prototype.parseBase64ByImgUrl = function(imgUrl, callback) {
        var self = this ;

        var img = new Image() ;
        
        img.onload = function() {
            self.data.width = this.width || 0 ;
            self.data.height = this.height || 0 ;
            var canvas = document.createElement('canvas') ;
            var ctx = canvas.getContext('2d') ;
            var _size = self.options.size.split('x') ;
            canvas.width = _size[0] ;
            canvas.height = _size[1] ;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height) ;
            callback(canvas) ;
        } ;
        
        img.src = imgUrl ;
    } ;
    
    r_thumbnail.prototype.parseCanvas = function(canvas, callback) {
        var self = this ;
        
        if (self.options.type==="base64") {
            callback(canvas.toDataURL()) ;
        }
        
        if (self.options.type==="image") {
            var img = new Image() ;
            img.onload = function() {
                callback(img) ;
            } ;
            img.src = canvas.toDataURL() ;
        }
        
        if (self.options.type==="canvas") {
            callback(canvas) ;
        }
        
        if (self.options.type==="blob") {
            canvas.toBlob(function(blob) {
                callback(blob) ;
            }) ;
        }
        
        if (self.options.type==="arraybuffer") {
            canvas.toBlob(function(blob) {
                var reader = new FileReader() ;
                reader.onload = function() {
                    callback(this.result) ;
                } ;
                reader.readAsArrayBuffer(blob)                 
            }) ;
        }
        
        if (self.options.type==="hex") {
            canvas.toBlob(function(blob) {
                var reader = new FileReader() ;
                reader.onload = function() {
                    callback(buf2hex(this.result)) ;
                } ;
                reader.readAsArrayBuffer(blob)                 
                
            }) ;
        }        
        
    } ;
    
    r_thumbnail.prototype.prepare2Callback = function(result) {
        var self = this ;
        
        var rtnObj = {} ;
        rtnObj.file = self.target ;
        rtnObj.type = self.options.type ;
        rtnObj.thumbnail = result ;
        if (self.options.withData) rtnObj.data = self.data ;
        
        self.callback(rtnObj) ;
    } ;
    
    $[pgn] = function () {
        
        new r_thumbnail(arguments) ;

    } 
    
})( jQuery, window, document ); 

/*
Copyright (c) 2015 creeperyang. Licensed under the MIT license.
handle id3-parser
*/
;(function ( $, window, document, undefined ) {
    var H = $("html") ;
    var W = $(window) ;
    var D = $(document) ;
    // Create the defaults once     
    var pgn = 'https://github.com/creeperyang/id3-parser' ;

    var Genres = [
        'Blues',
        'Classic Rock',
        'Country',
        'Dance',
        'Disco',
        'Funk',
        'Grunge',
        'Hip-Hop',
        'Jazz',
        'Metal',
        'New Age',
        'Oldies',
        'Other',
        'Pop',
        'R&B',
        'Rap',
        'Reggae',
        'Rock',
        'Techno',
        'Industrial',
        'Alternative',
        'Ska',
        'Death Metal',
        'Pranks',
        'Soundtrack',
        'Euro-Techno',
        'Ambient',
        'Trip-Hop',
        'Vocal',
        'Jazz+Funk',
        'Fusion',
        'Trance',
        'Classical',
        'Instrumental',
        'Acid',
        'House',
        'Game',
        'Sound Clip',
        'Gospel',
        'Noise',
        'AlternRock',
        'Bass',
        'Soul',
        'Punk',
        'Space',
        'Meditative',
        'Instrumental Pop',
        'Instrumental Rock',
        'Ethnic',
        'Gothic',
        'Darkwave',
        'Techno-Industrial',
        'Electronic',
        'Pop-Folk',
        'Eurodance',
        'Dream',
        'Southern Rock',
        'Comedy',
        'Cult',
        'Gangsta Rap',
        'Top 40',
        'Christian Rap',
        'Pop / Funk',
        'Jungle',
        'Native American',
        'Cabaret',
        'New Wave',
        'Psychedelic',
        'Rave',
        'Showtunes',
        'Trailer',
        'Lo-Fi',
        'Tribal',
        'Acid Punk',
        'Acid Jazz',
        'Polka',
        'Retro',
        'Musical',
        'Rock & Roll',
        'Hard Rock',
        'Folk',
        'Folk-Rock',
        'National Folk',
        'Swing',
        'Fast  Fusion',
        'Bebob',
        'Latin',
        'Revival',
        'Celtic',
        'Bluegrass',
        'Avantgarde',
        'Gothic Rock',
        'Progressive Rock',
        'Psychedelic Rock',
        'Symphonic Rock',
        'Slow Rock',
        'Big Band',
        'Chorus',
        'Easy Listening',
        'Acoustic',
        'Humour',
        'Speech',
        'Chanson',
        'Opera',
        'Chamber Music',
        'Sonata',
        'Symphony',
        'Booty Bass',
        'Primus',
        'Porn Groove',
        'Satire',
        'Slow Jam',
        'Club',
        'Tango',
        'Samba',
        'Folklore',
        'Ballad',
        'Power Ballad',
        'Rhythmic Soul',
        'Freestyle',
        'Duet',
        'Punk Rock',
        'Drum Solo',
        'A Cappella',
        'Euro-House',
        'Dance Hall',
        'Goa',
        'Drum & Bass',
        'Club-House',
        'Hardcore',
        'Terror',
        'Indie',
        'BritPop',
        'Negerpunk',
        'Polsk Punk',
        'Beat',
        'Christian Gangsta Rap',
        'Heavy Metal',
        'Black Metal',
        'Crossover',
        'Contemporary Christian',
        'Christian Rock',
        'Merengue',
        'Salsa',
        'Thrash Metal',
        'Anime',
        'JPop',
        'Synthpop',
        'Rock/Pop'
    ];

    var frameTypes = {
        /*
         * Textual frames
         */
        'TALB': 'album',
        'TBPM': 'bpm',
        'TCOM': 'composer',
        'TCON': 'genre',
        'TCOP': 'copyright',
        'TDEN': 'encoding-time',
        'TDLY': 'playlist-delay',
        'TDOR': 'original-release-time',
        'TDRC': 'recording-time',
        'TDRL': 'release-time',
        'TDTG': 'tagging-time',
        'TENC': 'encoder',
        'TEXT': 'writer',
        'TFLT': 'file-type',
        'TIPL': 'involved-people',
        'TIT1': 'content-group',
        'TIT2': 'title',
        'TIT3': 'subtitle',
        'TKEY': 'initial-key',
        'TLAN': 'language',
        'TLEN': 'length',
        'TMCL': 'credits',
        'TMED': 'media-type',
        'TMOO': 'mood',
        'TOAL': 'original-album',
        'TOFN': 'original-filename',
        'TOLY': 'original-writer',
        'TOPE': 'original-artist',
        'TOWN': 'owner',
        'TPE1': 'artist',
        'TPE2': 'band',
        'TPE3': 'conductor',
        'TPE4': 'remixer',
        'TPOS': 'set-part',
        'TPRO': 'produced-notice',
        'TPUB': 'publisher',
        'TRCK': 'track',
        'TRSN': 'radio-name',
        'TRSO': 'radio-owner',
        'TSOA': 'album-sort',
        'TSOP': 'performer-sort',
        'TSOT': 'title-sort',
        'TSRC': 'isrc',
        'TSSE': 'encoder-settings',
        'TSST': 'set-subtitle',
        'TXXX': 'user-defined-text-information',
        'TYER': 'year',
        /*
         * URL frames
         */
        'WCOM': 'url-commercial',
        'WCOP': 'url-legal',
        'WOAF': 'url-file',
        'WOAR': 'url-artist',
        'WOAS': 'url-source',
        'WORS': 'url-radio',
        'WPAY': 'url-payment',
        'WPUB': 'url-publisher',
        /*
         * URL frames (<=2.2)
         */
        'WAF': 'url-file',
        'WAR': 'url-artist',
        'WAS': 'url-source',
        'WCM': 'url-commercial',
        'WCP': 'url-copyright',
        'WPB': 'url-publisher',
        /*
         * Comment frame
         */
        'COMM': 'comments',
        'USLT': 'lyrics',
        /*
         * Image frame
         */
        'APIC': 'image',
        'PIC': 'image'
    };

    var imageTypes =[
        'other',
        'file-icon',
        'icon',
        'cover-front',
        'cover-back',
        'leaflet',
        'media',
        'artist-lead',
        'artist',
        'conductor',
        'band',
        'composer',
        'writer',
        'location',
        'during-recording',
        'during-performance',
        'screen',
        'fish',
        'illustration',
        'logo-band',
        'logo-publisher'
    ];

    var StringUtils = {
        readUTF16String: function(bytes, bigEndian, maxBytes) {
            var ix = 0;
            var offset1 = 1, offset2 = 0;
            maxBytes = Math.min(maxBytes||bytes.length, bytes.length);

            if( bytes[0] === 0xFE && bytes[1] === 0xFF ) {
                bigEndian = true;
                ix = 2;
            } else if( bytes[0] === 0xFF && bytes[1] === 0xFE ) {
                bigEndian = false;
                ix = 2;
            }
            if( bigEndian ) {
                offset1 = 0;
                offset2 = 1;
            }

            var arr = [], byte1, byte2, byte3, byte4, word1, word2, j;
            for( j = 0; ix < maxBytes; j++ ) {
                byte1 = bytes[ix+offset1];
                byte2 = bytes[ix+offset2];
                word1 = (byte1<<8)+byte2;
                ix += 2;
                if( word1 === 0x0000 ) {
                    break;
                } else if( byte1 < 0xD8 || byte1 >= 0xE0 ) {
                    arr[j] = String.fromCharCode(word1);
                } else {
                    byte3 = bytes[ix+offset1];
                    byte4 = bytes[ix+offset2];
                    word2 = (byte3<<8)+byte4;
                    ix += 2;
                    arr[j] = String.fromCharCode(word1, word2);
                }
            }
            return arr.join('');
        },
        readUTF8String: function(bytes, maxBytes) {
            var ix = 0;
            maxBytes = Math.min(maxBytes||bytes.length, bytes.length);

            if( bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF ) {
                ix = 3;
            }

            var arr = [];
            for( var j = 0; ix < maxBytes; j++ ) {
                var byte1 = bytes[ix++], byte2, byte3, byte4, codepoint;
                if( byte1 === 0x00 ) {
                    break;
                } else if( byte1 < 0x80 ) {
                    arr[j] = String.fromCharCode(byte1);
                } else if( byte1 >= 0xC2 && byte1 < 0xE0 ) {
                    byte2 = bytes[ix++];
                    arr[j] = String.fromCharCode(((byte1&0x1F)<<6) + (byte2&0x3F));
                } else if( byte1 >= 0xE0 && byte1 < 0xF0 ) {
                    byte2 = bytes[ix++];
                    byte3 = bytes[ix++];
                    arr[j] = String.fromCharCode(((byte1&0x0F)<<12) + ((byte2&0x3F)<<6) + (byte3&0x3F));
                } else if( byte1 >= 0xF0 && byte1 < 0xF5) {
                    byte2 = bytes[ix++];
                    byte3 = bytes[ix++];
                    byte4 = bytes[ix++];
                    codepoint = ((byte1&0x07)<<18) + ((byte2&0x3F)<<12)+ ((byte3&0x3F)<<6) + (byte4&0x3F) - 0x10000;
                    arr[j] = String.fromCharCode(
                        (codepoint>>10) + 0xD800,
                        (codepoint&0x3FF) + 0xDC00
                    );
                }
            }
            return arr.join('');
        },
        readNullTerminatedString: function(bytes, maxBytes) {
            var arr = [], i, byte1;
            maxBytes = maxBytes || bytes.length;
            for ( i = 0; i < maxBytes; ) {
                byte1 = bytes[i++];
                if( byte1 === 0x00 ) {
                    break;
                }
                arr[i-1] = String.fromCharCode(byte1);
            }
            return arr.join('');
        },
        // thanks for Satyam's pr <https://github.com/creeperyang/id3-parser/pull/9>
        readISO8859String: function(bytes, maxBytes) {
            var arr = [], i, byte1;
            maxBytes = maxBytes || bytes.length;
            for ( i = 0; i < maxBytes; ) {
                byte1 = bytes[i++];
                arr[i-1] = String.fromCharCode(byte1);
            }
            return arr.join('');
        }
    };

    var readUTF16String = StringUtils.readUTF16String;
    var readUTF8String = StringUtils.readUTF8String;
    var readISO8859String = StringUtils.readISO8859String;

    var V1_MIN_LENGTH = 128;
    var V2_MIN_LENGTH = 20; // TAG HEADER(10) + ONE FRAME HEADER(10)

    var noop = function() {};

    var GLOBAL;
    if (typeof window === 'object' && window.window === window) {
        GLOBAL = window;
        GLOBAL.Buffer = noop;
        // Attach parse to window if in browser
        GLOBAL.ID3 = {
            parse: parse
        };
    } else if (typeof global === 'object' && global.global === global) {
        GLOBAL = global;
        GLOBAL.File = noop;
        GLOBAL.FileReader = noop;
    } else {
        GLOBAL = this;
    }

    if (!GLOBAL.Promise) {
        //GLOBAL.Promise = require('promise-a-plus');
    } else if (!GLOBAL.Promise.defer) {
        // node 7.0+, Promise.defer is undefined
        Promise.defer = function() {
            var deferred = {};
            deferred.promise = new Promise(function(resolve,reject) {
                deferred.resolve = resolve;
                deferred.reject = reject;
            });
            return deferred;
        };
    }

    // Within v8 engine, Uint8Array may not have slice method, use subarray instead
    if(!('slice' in Uint8Array.prototype)) {
        Uint8Array.prototype.slice = Uint8Array.prototype.subarray;
    }

    /**
     * parse id3 tag from buffer or file
     *
     * @param {Buffer|Uint8Array|File} buffer - Buffer to parse.
     * @return {Promise}
    */
    function parse(buffer) {
        var deferred = Promise.defer();
        var reader;
        if(buffer instanceof File) {
            reader = new FileReader();
            reader.onload = function(e) {
                buffer = new Uint8Array(e.target.result);
                deferred.resolve(buffer);
            };
            reader.readAsArrayBuffer(buffer);
        } else if(buffer instanceof Buffer || buffer instanceof Uint8Array){
            deferred.resolve(buffer);
        } else {
            deferred.reject(
                new TypeError('argument should be instance of Buffer|Uint8Array|File')
            );
        }
        return deferred.promise.then(function(buffer) {
            var v1 = parseV1FromBuffer(buffer);
            var v2 = parseV2FromBuffer(buffer);

            var p;
            if (v2) {
                for(p in v1) {
                    if(!(p in v2) || (v2[p] === '')) {
                        v2[p] = v1[p];
                    }
                }
                v2.version = {
                    v1: v1 && v1.version,
                    v2: v2.version
                };
                return v2;
            } else {
                if (v1) {
                    v1.version = {
                        v1: v1.version,
                        v2: false
                    };
                    return v1;
                } else {
                    return {
                        version: false
                    };
                }
            }
        });
    }

    function parseV1FromBuffer(buffer) {
        if(!buffer || buffer.length < V1_MIN_LENGTH) {
            return false;
        }

        buffer = buffer.slice(buffer.length - V1_MIN_LENGTH);

        var tags = {
            version: {
                major: 1,
                minor: 0
            }
        };
        var flag = readUTF8String(buffer, 3);
        var whiteRe = /(^[\s\u0000]+|[\s\u0000]+$)/;
        if(flag !== 'TAG') {
            return false;
        }

        // .replace(/(^\s+|\s+$)/, '')
        tags.title = readUTF8String(buffer.slice(3), 30).replace(whiteRe, '');
        tags.artist = readUTF8String(buffer.slice(33), 30).replace(whiteRe, '');
        tags.album = readUTF8String(buffer.slice(63), 30).replace(whiteRe, '');
        tags.year = readUTF8String(buffer.slice(93), 4).replace(whiteRe, '');


        // If there is a zero byte at [125], the comment is 28 bytes and the remaining 2 are [0, trackno]
        if(buffer[125] === 0) {
            tags.comment = readUTF8String(buffer.slice(97), 28).replace(whiteRe, '');
            tags.version.minor = 1;
            tags.track = buffer[126];
        } else {
            tags.comment = readUTF8String(buffer.slice(97), 30).replace(whiteRe, '');
        }
        tags.genre = Genres[buffer[127]] || '';

        return tags;
    }

    function parseV2FromBuffer(buffer) {
        if(!buffer || buffer.length < V2_MIN_LENGTH) {
            return false;
        }
        var tags = parseV2Header(buffer.slice(0, 14));
        var flags, headerSize, tagSize;
        if(!tags) {
            return false;
        }
        flags = tags.version.flags;
        headerSize = 10;

        // Currently do not support unsynchronisation
        if(flags.unsync) {
            throw new Error('not support unsynchronisation');
        }

        // Increment the header size to offset by if an extended header exists
        if(flags.xheader) {
            // usually extended header size is 6 or 10 bytes
            headerSize += calcTagSize(buffer.slice(10, 14));
        }

        tagSize = calcTagSize(buffer.slice(6, 10));
        parseV2Frames(buffer.slice(headerSize, tagSize + headerSize), tags);
        return tags;
    }

    /**
     * Parse single v2 frame
     *
     * @param {Buffer|Uint8Array} buffer - buffer to parse
     * @param {Number} minor - specify minor version of id3v2, future usage to parse v2.2/v2.4
     */
    function parseFrame(buffer, minor, size) {
        var result = {tag: null, value: null};
        var header = {
            id: readUint8String(buffer, 4, 0),
            type: readUint8String(buffer, 1, 0),
            size: size || calcFrameSize(buffer.slice(4)),
            flags: [
                buffer[8],
                buffer[9]
            ]
        };
        var i, encoding, variableStart, variableLength;

        if(minor === 4) {
            // TODO: parse v2.4 frame
        }

        // No support for compressed, unsychronised, etc frames
        if(header.flags[1] !== 0) {
            return false;
        }
        if(!(header.id in frameTypes)) {
            return false;
        }
        result.tag = frameTypes[header.id];

        if(header.type === 'T') {
            encoding = buffer[10];

            // TODO: Implement UTF-8, UTF-16 and UTF-16 with BOM properly?
            if(encoding === 0) {
                result.value = readISO8859String(buffer.slice(11));
            } else if (encoding === 3) {
                result.value = readUTF8String(buffer.slice(11));
            } else if(encoding === 1 || encoding === 2) {
                result.value = readUTF16String(buffer.slice(11));
            } else {
                return false;
            }
            if(header.id === 'TCON' && !!parseInt(result.value)) {
                result.value = Genres[parseInt(result.value)];
            }
        } else if(header.type === 'W') {
            result.value = readUTF8String(buffer.slice(10));
        } else if(header.id === 'COMM' || header.id === 'USLT') {

            // TODO: Implement UTF-16 without BOM properly?
            encoding = buffer[10];
            variableStart = 14;
            variableLength = 0;

            // Skip the comment description and retrieve only the comment its self
            for(i = variableStart;; i++) {
                if(encoding === 1 || encoding === 2) {
                    if(buffer[i] === 0 && buffer[i+1] === 0) {
                        variableStart = i + 2;
                        break;
                    }
                    i++;
                } else {
                    if(buffer[i] === 0) {
                        variableStart = i + 1;
                        break;
                    }
                }
            }
            if(encoding === 0 || encoding === 3) {
                result.value = readUTF8String(buffer.slice(variableStart));
            } else if(encoding === 1 || encoding === 2) {
                result.value = readUTF16String(buffer.slice(variableStart));
            } else {
                return false;
            }
        } else if(header.id === 'APIC') {
            encoding = buffer[10];
            var image = {
                    type: null,
                    mime: null,
                    imageType: null, // cover(front)/cover(back)/ ....
                    description: null,
                    data: null
                };
            variableStart = 11;
            variableLength = 0;
            for(i = variableStart;;i++) {
                if(buffer[i] === 0) {
                    variableLength = i - variableStart;
                    break;
                }
            }
            image.mime = readUTF8String(buffer.slice(variableStart), variableLength);
            image.type = imageTypes[buffer[variableStart + variableLength + 1]] || 'other';
            variableStart += variableLength + 2;
            variableLength = 0;
            for(i = variableStart;; i++) {
                if(buffer[i] === 0) {
                    variableLength = i - variableStart;
                    break;
                }
            }
            image.description = variableLength === 0 ? null : readUTF16String(buffer.slice(variableStart), variableLength);
            variableStart += variableLength + 1;
            // check $00 at start of the image binary data
            for(i = variableStart;; i++) {
                if(buffer[i] === 0) {
                    variableStart++;
                } else {
                    break;
                }
            }
            image.data = buffer.slice(variableStart);//variableStart + 1
            result.value = image;
        }
        return (result.tag ? result : false);
    }

    /**
     * Parse id3v2 header
     *
     * @param {Buffer|Uint8Array} buffer - the header buffer(>= 10 bytes)
     * @param {Object} tags - optional, the object for header info to write into
     *
     * @return {Object} parsed info
     */
    function parseV2Header(buffer, tags) {
        if(!buffer || buffer.length < 10) {
            return false;
        }
        tags = tags || {};
        var identity = readUTF8String(buffer, 3);
        var version, flags, flagUint;
        if(identity !== 'ID3') {
            return false;
        }
        version = tags.version || (tags.version = {major: 2});
        flags = tags.version.flags || (tags.version.flags = {});

        version.minor = buffer[3];
        version.revision = buffer[4];
        flagUint = buffer[5];
        // 是否使用Unsynchronisation
        flags.unsync = flagUint & 0x80 !== 0;
        // 是否有扩展头部
        flags.xheader = flagUint & 0x40 !== 0;
        // 是否为测试标签
        flags.experimental = flagUint & 0x20 !== 0;

        return tags;
    }

    /*
     * parse all frames of a id3v2 tag
     */
    function parseV2Frames(buffer, tags) {
        var position = 0;
        var version = tags.version;

        while(position < buffer.length) {
            var frame, slice;
            var size = calcFrameSize(buffer.slice(position + 4));
            // the left data would be '\u0000\u0000...', just a padding
            if(size === 0) {
                break;
            }
            // * < v2.3, frame ID is 3 chars, size is 3 bytes making a total size of 6 bytes
            // * >= v2.3, frame ID is 4 chars, size is 4 bytes, flags are 2 bytes, total 10 bytes
            slice = buffer.slice(position, position + 10 + size);
            if(!slice.length) {
                break;
            }
            frame = parseFrame(slice, version.minor, size);
            if(frame) {
                tags[frame.tag] = frame.value;
            }
            position += slice.length;
        }
    }

    /**
     * calc total id3v2 tag size(include header and all frames)
     *
     * @param {Uint8Array} buffer - 0xxxxxxx 0xxxxxxx 0xxxxxxx 0xxxxxxx
     */
    function calcTagSize(buffer) {
        return (buffer[0] & 0x7f) * 0x200000 +
            (buffer[1] & 0x7f) * 0x4000 +
            (buffer[2] & 0x7f) * 0x80 +
            (buffer[3] & 0x7f);
    }

    /**
     * calc every id3v2 frame size(include header(10 bytes) and content size)
     *
     * @param {Uint8Array} buffer - xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx
     */
    function calcFrameSize(buffer) {
        return buffer.length < 4 ? 0 : buffer[0] * 0x1000000 +
            buffer[1] * 0x10000 +
            buffer[2] * 0x100 +
            buffer[3];
    }

    /**
     * read string from buffer as uint8
     *
     * @param {Buffer/Uint8Array} buffer - read uint8 from buffer
     * @param {number} length - read length
     * @param {number} offset - read start index
     */
    function readUint8String(buffer, length, offset, raw) {
        offset = offset || 0;
        if(length < 0) {
            length += buffer.length;
        }
        var str = '';
        if(Buffer !== noop) {
            buffer = buffer.slice(offset, offset+length);
            return (buffer instanceof Buffer) ? buffer.toString() : (new Buffer(buffer)).toString();
        } else {
            for(var i = offset; i < (offset + length); i++) {
                str += String.fromCharCode(buffer[i]);
            }
            if(raw) {
                return str;
            }
            return decodeURIComponent(encodeURIComponent(str));
        }
    }
        
    $[pgn] = (function() {
        return {
            "parse": parse
        } ;
    })() ;
    
})( jQuery, window, document ); 
