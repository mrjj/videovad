#!/bin/bash

export CATALOG_BASE_URI=${CATALOG_BASE_URI:-'https://catalog.rusneb.ru/'}
export CATALOG_KEY_TOKEN=${CATALOG_KEY_TOKEN:-'13ac570f4cedb9b8ce7711a2c763b04e'}

# FIXME: Run worker as stand-alone service.

"$@"
