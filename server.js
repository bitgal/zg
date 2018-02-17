const express = require('express');
const bodyParser = require('body-parser');
const { request, GraphQLClient } = require('graphql-request');

const app = express();

const endpoint = "https://web-backend-dev.zeitgold.com/graphql"

const variables = {
  businessId: "QnVzaW5lc3NOb2RlOjE0Mjc2Y2FhLTA4NmEtNGVmNi04NzMxLTNmYWUzMjE3ZjVlZQ==",
}

const payablesQuery = `query payables {
  payables {
    edges {
      node {
        id
        amount
        dateOccurred
        referenceId
        businessTransaction {
          id
          business {
            id
          }
        }
      }
    }
  }
}`

app.get('/', (req, res) => res.send('time is money'))

const jsonParser = bodyParser.json()

// Example Call: curl -H "Content-Type: application/json" -X POST -d '{"amount": 313, "payment_reference": "AB1273", "payment_date": "2018-01-13"}' http://localhost:3000/link
app.post('/link', jsonParser, function (req, res) {
  if (!req.is('json')) {
    res.send("wrong format: please send json");
  } else {
    let paymentAmount = req.body.amount;
    let paymentReference = req.body.payment_reference;
    let paymentDate = req.body.payment_date;

    console.log(req.body);

    request(endpoint, payablesQuery, variables)
      .then(data => {
        const allPayables = data.payables.edges;

        const filteredByBusinessId = allPayables.filter(
          payable =>
          (
            (payable.node.businessTransaction) &&
            (payable.node.businessTransaction.business.id == variables.businessId)
          )
        );
        //get possible businessTransaction ids
        const filteredByPaymentInput = filteredByBusinessId.filter(
          payable =>
          (
            (Date.parse(payable.node.dateOccurred) <= Date.parse(paymentDate)) &&
            (
              (payable.node.amount == paymentAmount) ||
              (payable.node.referenceId == paymentReference) ||
              referenceSimilarity(payable.node.referenceId, paymentReference)
              // (payable.node.amount >= paymentAmount)
            )
          )
        );
        console.log(filteredByPaymentInput);

        let possibleTransactionsIds = filteredByPaymentInput.map(
          payable => payable.node.businessTransaction.id)

        console.log("transaction Ids", possibleTransactionsIds);
        return possibleTransactionsIds;
      });
  }
})

function referenceSimilarity(payableReference, paymentReference) {
  console.log("ref sim called");
  //uniform reference strings
  let payableRef = payableReference.toLowerCase().replace(/[^A-Za-z0-9\s]/, '');
  let paymentRef = paymentReference.toLowerCase().replace(/[^A-Za-z0-9\s]/, '');

  //look for matching pattern - digits
  //find all numeric sequences in the payment reference
  let numericPattern = (/[0-9]{2,}/g);
  while ((numericSeqInPaymentRef = numericPattern.exec(paymentRef)) !== null) {
    //for each found numeric sequence, check in Payable for a match
    if (payableRef.includes(numericSeqInPaymentRef[0])) {
      console.log("numericPaymentRef match: " + numericSeqInPaymentRef[0]);
      return true;
    }
  }

  //look for matching pattern - chars
  let charsPattern = (/[a-z]{2,}/g)
  while((charsSeqInPaymentRef = charsPattern.exec(paymentRef)) !== null) {
    if (payableRef.includes(charsSeqInPaymentRef[0])) {
      console.log("charPaymentRef match: " + charsSeqInPaymentRef[0]);
      return true;
    }
  }

  //look for partial inclusion of payment ref in payable ref
  if (paymentRef.length >= 2) {
    for (let i=0; i<=paymentRef.length-2; i++) {
      console.log(i);
      let slicedPaymentReference = paymentRef.slice(i, i+paymentRef.length/2)
      console.log("checking sliced match: " + slicedPaymentReference);
      if (payableRef.includes(slicedPaymentReference)) {
        console.log("slice match found: "+ slicedPaymentReference);
        return true;
      }
    }
    console.log("no match in reference");
  }
}

app.listen(3000, () => console.log('try me out on port 3000'));
