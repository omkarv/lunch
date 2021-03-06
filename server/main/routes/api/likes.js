'use strict';

// ## Module Dependencies
var _ = require('lodash');
var sw = require('swagger-node-express');
var utils = require('../../utils');
var colog = require('colog');

// ## Models
var Likes = require('../../models/likes');

var param = sw.params;
var swe = sw.errors;

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(
    process.env['NEO4J_URL'] ||
    'http://localhost:7474'
);


// ## Helpers
var _prepareParams = function (req) {
  var params = req.body;

  params.id = req.params.id || req.body.id;

  return params;
};

// callback helper function
// 
// This is meant to be bound to a new function within the endpoint request callback
// using _partial(). The first two parameters should be provided by the request callback 
// for the endpoint this is being used in.
//
// Example:
//
// action: function(req, res) {
//   var errLabel = 'Route: POST /likes';
//   var callback = _.partial(_callback, res, errLabel);
// }
var _callback = function (res, errLabel, err, results, queries) {
  var start = new Date();

  if (err || !results) {
    if (err) colog.error(errLabel + err);
    swe.invalid('input', res);
    return;
  }

  utils.writeResponse(res, results, queries, start);
};


// ## API Specs

// Route: GET '/likes'
exports.list = {

  spec: {
    description : 'List all likes',
    path : '/likes',
    method: 'GET',
    summary : 'Find all likes',
    notes : 'Returns all likes',
    type: 'object',
    items: {
      $ref: 'Like'
    },
    produces: ['application/json'],
    parameters : [],
    responseMessages: [swe.notFound('likes')],
    nickname : 'getLikes'
  },

  action: function (req, res) {
    var options = {};
    var errLabel = 'Route: GET /likes';
    var callback = _.partial(_callback, res, errLabel);
    
    options.neo4j = utils.existsInQuery(req, 'neo4j');

    Likes.getAll(null, options, callback);
  }
};


// Route: POST '/likes'
exports.addLike = {
  
  spec: {
    path : '/likes',
    notes : 'adds a like to the graph',
    summary : 'Add a new like to the graph',
    method: 'POST',
    type : 'object',
    items : {
      $ref: 'Like'
    },
    parameters : [
      param.form('userId', 'User UUID', 'string', true),
      param.form('id', 'like UUID', 'string', true),
      param.form('name', 'Like name', 'string', true),
     ],
    responseMessages : [swe.invalid('input')],
    nickname : 'addLike'
  },

  action: function(req, res) {
    var options = {};
    var params = {};
    var errLabel = 'Route: POST /likes';
    var callback = _.partial(_callback, res, errLabel);

    options.neo4j = utils.existsInQuery(req, 'neo4j');
    params = _prepareParams(req);
    Likes.create(params, options, callback);

  }
};

// // Route: DELETE '/likes/:id'
exports.deleteLikeRelation = {

  spec: {
    path: '/likes/{id}',
    notes: 'Deletes an existing user and like relationships',
    summary: 'Delete a  user and like relationships',
    method: 'DELETE',
    type: 'object',
    parameters: [
      param.path('id', 'ID of like to be deleted', 'string'),
      param.form('userId', 'User Id', 'string', true),

    ],
    responseMessages: [swe.invalid('input')],
    nickname : 'deleteLikeRelation'
  },

  action: function (req, res) {
    var id = req.params.id;
    var options = {};
    var params = {};

    if (!id) throw swe.invalid('id');

    var errLabel = 'Route: DELETE /likes/{id}';
    var callback = _.partial(_callback, res, errLabel);

    options.neo4j = utils.existsInQuery(req, 'neo4j');
    params = _prepareParams(req);

    Likes.deleteLikeRelation(params, options, callback);
  }
};
