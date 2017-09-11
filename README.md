# r_thumbnail

A jQuery plugin to parse thumbnail

All kinds of Images、Videos、Audios. - As long as your browser surpport it.
Chrome is the best browser to use this tool.

### Usage

```js
$('.testfile').change(function(ev) {
    var target = ev.currentTarget ;
    var file = target.files[0] ;

    $.r_thumbnail(file, {
        type: "image"
    }, function(result) {
        $('body').append(result) ;
        //console.log(result) ;
    })
}) ;
```

### Input Arguments
Only accept file.

#### Options
default type: image [base64, image, canvas, blob, arraybuffer, hex]

#### Demo Video
[![Video Link](https://www.facebook.com/ryanyang0818/videos/10213323607300029/)]
