#/bin/bash
openssl genrsa -out ./cert/spc-anywhere-key.pem 1024 

openssl req -new -key ./cert/spc-anywhere-key.pem -out ./cert/spc-anywhere-cert.csr
#### SETTINGS #####################
# Country Name (2 letter code) [AU]:SV
# State or Province Name (full name) [Some-State]:GBG
# Locality Name (eg, city) []:GBG
# Organization Name (eg, company) [Internet Widgits Pty Ltd]:MyCompany
# Organizational Unit Name (eg, section) []:
# Common Name (e.g. server FQDN or YOUR name) []:SPC
# Email Address []:
#
# Please enter the following 'extra' attributes
# to be sent with your certificate request
# A challenge password []:
# An optional company name []:
###########################

openssl x509 -req -days 10000 -in ./cert/spc-anywhere-cert.csr -signkey ./cert/spc-anywhere-key.pem -out ./cert/spc-anywhere-cert.pem

