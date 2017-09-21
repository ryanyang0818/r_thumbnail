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
            type: "image",
            withData: true
        }, function(resp) {
console.log(resp) ;
/*
{
    file; file
    type: image
    thumbnail: thumbnail
    data: 
    {  //music
        width
        height
        duration
        year
        album
        artist
        genre
    },
    {  //photo
        width
        height
    },
    {  //video
        width
        height
        duration
    },
}
*/
            $('body').append(resp.thumbnail) ;
        })
    }) ;
    
}) ;
```

### Input Arguments
Only accept file.

#### Options
default type: image [base64, image, canvas, blob, arraybuffer, hex]
default withData: false

#### Demo Video
https://www.facebook.com/ryanyang0818/videos/10213323607300029/
