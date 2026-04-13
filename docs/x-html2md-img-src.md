# Image Authentication for BYOM Content Sources

When Edge Delivery Services previews a page from a [BYOM content source](/developer/byom), it downloads and uploads all images referenced in the HTML to the media bus. If your content source requires authentication and your images are hosted on external domains that share the same credentials, you need to tell Edge Delivery Services which image hosts are allowed to receive the authentication header.

## How it works

By default, the authentication header used to fetch the source content is only forwarded to image URLs on the **same host** as the content source (`self`). Images hosted on other domains are fetched without authentication.

To allow the authentication header to be forwarded to additional hosts, the content source must include the `x-html2md-img-src` response header in its HTTP response. The value is a space-separated list of allowed origins, modeled after the [`img-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/Sources) of the Content-Security-Policy header.

```
x-html2md-img-src: <source> [<source> ...]
```

The `self` origin is always implicitly included. This means images on the same host as the source URL always receive the authentication header, even if the header is absent or empty.

## Supported source values

| Value | Description | Example |
|---|---|---|
| `*` | Wildcard. Forward the auth header to all image hosts. | `*` |
| `self` | The same host as the source URL. Always implicitly included. | `self` |
| `<host>` | An exact hostname. Auth is forwarded to images served from this host. | `images.example.com` |
| `*.<domain>` | Wildcard subdomain. Auth is forwarded to any subdomain of the domain. | `*.example.com` |

A full URL including protocol and path may be provided, but only the host portion is evaluated. The protocol and path are ignored.

## Examples

### Allow all image hosts to receive the authentication header

If all your images require the same credentials as the content source, use the wildcard:

```
x-html2md-img-src: *
```

### Allow a specific CDN host

If your images are served from a dedicated CDN that shares credentials with the content source:

```
x-html2md-img-src: images.example.com
```

### Allow all subdomains of a domain

```
x-html2md-img-src: *.example.com
```

### Allow multiple hosts

Multiple sources can be combined in a single header value:

```
x-html2md-img-src: self https://images.example.com assets.cdn.net
```

### No header or empty value

If the `x-html2md-img-src` header is absent or empty, only images on the same host as the content source will receive the authentication header. All other images are fetched without authentication.
