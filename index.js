var request   = require( 'request' ),
    cheerio   = require( 'cheerio' ),
    async     = require( 'async' ),
    fs        = require( 'fs' ),
    BASE_URL  = 'http://getmentalnotes.com',
    CARDS_URL = BASE_URL + '/cards',
    cards     = [];

function extractCardID ( href ) {
  return href.match( /.*\/(.*)$/ )[ 1 ];
}

function extractTextFromElementIterator ( index, element ) {
  return cheerio( this ).text();
}

function extractCardIDFromElementIterator ( index, element ) {
  return extractCardID( cheerio( this ).attr( 'href' ) );
}

function titleToID ( value, index, list ) {
  return value.toLowerCase().replace( /[\s\-]/g, '_' ).replace( '&', 'and' );
}

function parseCardPage ( callback, error, response, body ) {
  if ( error || response.statusCode !== 200 ) { callback( error ); return; }

  var $cardDetail = cheerio( body ).find( '#cardDetail' );

  cards.push( {
    id: titleToID( $cardDetail.find( '.info h1' ).text() ),
    title: $cardDetail.find( '.info h1' ).text(),
    summary: $cardDetail.find( '.info h2' ).text(),
    description: $cardDetail.find( '.content .how' ).next( 'p' ).text(),
    examples: $cardDetail.find( '.examples' ).next( 'ul' ).find( 'li' ).map( extractTextFromElementIterator ),
    categories: '',
    related: $cardDetail.find( '.seeAlso a' ).map( extractTextFromElementIterator ).map( titleToID ),
    resources: $cardDetail.find( '.resources p' ).text()
  } );

  callback();
}

// Parse card page and push result into cards array
function loadCardPage ( cardID, callback ) {
  console.log( 'Processing: ', cardID );
  request( [ CARDS_URL, cardID ].join( '/' ), parseCardPage.bind( this, callback ) );
}

// Parse CardIDs and populate the queue
function cardsPageLoaded ( error, response, body ) {
  if ( error || response.statusCode !== 200 ) { console.error( error ); return; }

  var $ = cheerio.load( body );

  // Populate the queue
  queue.push( $( '#cardList .card' ).map( extractCardIDFromElementIterator ) );
}

// Write contents of cards array to disk
function writeCardsJSON () {
  if ( cards.length != 53 ) { console.error( 'Failed to load all 53 cards!' ); return; }
  fs.writeFile( 'cards.json', JSON.stringify( cards, null, 2 ), { encoding: 'utf-8' },
    function fileWriteCallback ( error ) {
      if ( error ) { console.error( error ); }
      console.log( 'written ' + cards.length + ' cards to cards.json' );
    }
  );
}

// Setup queue
var queue = async.queue( loadCardPage, 20 );

// When all cards have been pushed to the deck
queue.drain = writeCardsJSON;

request( CARDS_URL, cardsPageLoaded );
