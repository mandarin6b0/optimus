## Optimus guard

* `$ npm install --save-dev`
* update `CONST` in `Gruntfile`
* `$ grunt watch`

Write code, save and see how autobot tests your API

```ruby
# GET|POST|PUT|DELETE /path/:some_id      - some_id will be searched in params
#
# == Specs                                - make new spec scope
#
#   params #=> result;                    - data - evaluable js params,
#                                           result - pattern matched expected response
#   #=> {a: 'ok'}                         - a should == 'ok'
#   #=> {a: '$var'}                       - store $var
#   #=> {a: {a: '$var'}}                  - deep $var
#   #=> {a: ['$first, ..., $last']        - get $first and $last element
#   #=> {a: ['...']}                      - not empty array
def index
  ...
end


# GET /path
#
# == Specs!                             - test only this (with ! orelse all)
#
#   {} #=> { status: 'ok' }
#
def show
  ...
end


# will not be tested
#
def some_helper_methods
  ...
end
```