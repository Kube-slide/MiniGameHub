"use strict";

//Get the items
import { ITEMS } from "../../constants/items.js";
//get player
import { PLAYERS } from "../../constants/player.js";

// ? Create the star for the ratings dynamically instead of manually
function dynamicStarAmount(rating) {
  let output = "";
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      output += "★"; // full star
    } else if (rating >= i - 0.5) {
      output += "⯨"; // half star
    } else {
      output += "☆"; // empty star
    }
  }
  return output;
}

ITEMS.forEach((item) => {
  const outerContainer = $("<div>").addClass("card");

  //Create the description section
  const leftSection = $("<div>").addClass("cardLeft").addClass("info");
  const productTitle = $("<h2>").text(item.title);
  const productDescription = $("<p>").text(item.description);
  leftSection.append(productTitle);
  leftSection.append(productDescription);

  //Create the price / review / pruchase section
  const rightSection = $("<div>").addClass("cardRight").addClass("info");
  const price = $("<div>")
    .addClass("price")
    .text(`$${item.price.toFixed(2)}`);
  const ratingHolder = $("<div>").addClass("rating");
  ratingHolder.append(
    $("<div>").addClass("stars").text(dynamicStarAmount(item.rating.rate))
  );
  ratingHolder.append(
    $("<div>").addClass("reviews").text(`(${item.rating.count})`)
  );
  const buy = $("<button>").text("Purchase");

  buy.on("click", () => {
    const priceVal = price.text().replace("$", "");
    if (priceVal <= PLAYERS[0].totalScore) {
      buy.addClass("purchased");
      buy.text("Purchased!");
      PLAYERS[0].totalScore -= priceVal;
    } else {
      buy.text("Not enough funds!");
      buy.addClass("broke");
      setTimeout(() => {
        buy.removeClass("broke");
        buy.text(`$${priceVal}`);
      }, 2000);
    }
  });

  rightSection.append(price);
  rightSection.append(ratingHolder);
  rightSection.append(buy);

  //Create our image
  const img = $("<img>")
    .attr("data-src", item.image)
    .attr("alt", item.title)
    .addClass("cardCenter");
  const centerSection = $("<div>").addClass("cardCenter").append(img);

  //Add items in order into our master div
  outerContainer.append(leftSection);
  outerContainer.append(centerSection);
  outerContainer.append(rightSection);
  $("body").append(outerContainer);
});

//get all the images
const images = $("img");

//get our splash screen and the enter button
const splash = $("#splash");
const enterButton = $("#enterButton");

//When the enter is clicked
enterButton.on("click", function () {
  // Fade out splash screen
  splash.css("opacity", 0);

  //Timer to let fade out play
  setTimeout(() => {
    splash.remove();
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        const image = $(entry.target);
        const curImageOrder = $("img");
        const curCards = $(".card");

        if (entry.isIntersecting) {
          const dataSrc = $(entry.target).data("src");
          image.attr("src", dataSrc).addClass("loaded");

          //! if we reached the last image
          if (curImageOrder.last()[0].alt === image[0].alt) {
            // * stop observing
            observer.disconnect();
            // * take top element and put beneath us
            curCards.last().after(curCards.first());
            // * restart observing
            images.each(function () {
              observer.observe(this);
            });
            //! if we reached the first / top image
          } else if (curImageOrder.first()[0].alt === image[0].alt) {
            //* same idea as before but inversed
            observer.disconnect();
            curCards.first().before(curCards.last());
            images.each(function () {
              observer.observe(this);
            });
          }
        }

        //If we arent intersecting, hide the content but keep it available
        if (!entry.isIntersecting) {
          image.removeClass("loaded");
        }
      });
    });

    //start initial observation
    images.each(function () {
      observer.observe(this);
    });

    //get all product info
    const info = $(".info");

    //Thresholds
    const options = {
      threshold: [0, 0.25, 1], // trigger at different visibility increments
    };

    // ? Observer specifically for the information around image
    const descObs = new IntersectionObserver((entries, descObs) => {
      entries.forEach((entry) => {
        const infoField = $(entry.target);

        //only show if 1/4 is in view
        if (entry.intersectionRatio >= 0.25) {
          infoField.addClass("loaded");
        }

        //hide when 3/4 is in view & product is leaving
        if (entry.intersectionRatio < 0.25) {
          infoField.removeClass("loaded");
        }
      });
    }, options);

    //start initial observation
    info.each(function () {
      descObs.observe(this);
    });
    //! delay before we start observing to let the fade animation play out
  }, 1000);
});
