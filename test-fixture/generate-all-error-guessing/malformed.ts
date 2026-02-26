// @bp.log
// Missing log message - malformed
function malformed1() {
  console.log('malformed 1');
}

// @bp.expr
// Missing expression - malformed
function malformed2() {
  console.log('malformed 2');
}

// @bp-invalid-directive
function malformed3() {
  console.log('malformed 3');
}

// This is the valid one - inline @bp
function validBp() {
  console.log('valid'); // @bp
}
