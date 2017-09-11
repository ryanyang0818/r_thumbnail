# r_thumbnail

A jQuery plugin to parse thumbnail

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
