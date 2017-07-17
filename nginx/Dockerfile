FROM nginx:stable-perl

COPY LoveLive.pm /etc/nginx/conf.d/
COPY default.conf /etc/nginx/conf.d/

CMD ["nginx", "-g", "daemon off; load_module /etc/nginx/modules/ngx_http_perl_module.so;"]
