FROM nginx:stable-perl

RUN apt-get update \
  && apt-get install -y git ca-certificates --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

COPY . /usr/share/app

RUN cp /usr/share/app/nginx/* /etc/nginx/conf.d/

RUN cd /usr/share/app \
  && git submodule init \
  && git submodule update \
  && ln -s /usr/share/app/content /usr/share/nginx/honoka

CMD ["nginx", "-g", "daemon off; load_module /etc/nginx/modules/ngx_http_perl_module.so;"]
