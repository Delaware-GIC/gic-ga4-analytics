#!/bin/bash
RUBY_V=(`ruby --version`)
if [ "${RUBY_V[1]}" != "2.5.3p105" ];
then
   echo "Wrong ruby version please run"
   echo -e "\e[33;1mscl enable rh-ruby25 bash\e[0m"
else
#   bundle exec jekyll build --watch --config=_config.yml,_development.yml  -d /var/www/analytics/html/
   bundle exec jekyll build --config=_config.yml,_development.yml  -d /var/www/analytics/html/
fi;


