import * as Carousel from "./Carousel.js";
import axios from "axios";

document.addEventListener("DOMContentLoaded", function () {
  const breedSelect = document.getElementById("breedSelect");
  const infoDump = document.getElementById("infoDump");
  const progressBar = document.getElementById("progressBar");
  const getFavouritesBtn = document.getElementById("getFavouritesBtn");

  const API_KEY =
    "live_ab7TR7BlVerMc0xxWHvzWoplrlEvJhmAp8cSJgbDmKTq7RroRH6hU59xixJxZUqJ";

  // Axios Interceptors for Request/Response
  axios.interceptors.request.use(
    (config) => {
      console.log("Request started at:", new Date().toISOString());
      config.metadata = { startTime: new Date() };

      // Reset progress bar
      progressBar.style.width = "0%";

      // Change cursor to progress style
      document.body.style.cursor = "progress";
      return config;
    },
    (error) => {
      document.body.style.cursor = "default";
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      const endTime = new Date();
      const duration = endTime - response.config.metadata.startTime;
      console.log(
        `Request completed in ${duration} ms at:`,
        new Date().toISOString()
      );

      // Change cursor back to default after the response
      document.body.style.cursor = "default";
      return response;
    },
    (error) => {
      document.body.style.cursor = "default";
      return Promise.reject(error);
    }
  );

  // Progress update function for onDownloadProgress
  function updateProgress(event) {
    if (event.lengthComputable) {
      const percentCompleted = Math.round((event.loaded * 100) / event.total);
      progressBar.style.width = `${percentCompleted}%`;
      console.log("Progress Event:", event);
    }
  }

  // Favourite/Unfavourite Toggle Function
  export async function favourite(imageId) {
    try {
      // Check if the image is already favourited
      const favResponse = await axios.get(
        "https://api.thecatapi.com/v1/favourites",
        {
          headers: {
            "x-api-key": API_KEY,
          },
        }
      );

      const favourites = favResponse.data;
      const existingFavourite = favourites.find(
        (fav) => fav.image_id === imageId
      );

      if (existingFavourite) {
        // If the image is already favourited, delete it (toggle off)
        const favouriteId = existingFavourite.id;
        await axios.delete(
          `https://api.thecatapi.com/v1/favourites/${favouriteId}`,
          {
            headers: {
              "x-api-key": API_KEY,
            },
          }
        );
        console.log(`Image ${imageId} removed from favourites`);
        return false; // Unfavourited
      } else {
        // If the image is not favourited, add it (toggle on)
        await axios.post(
          "https://api.thecatapi.com/v1/favourites",
          {
            image_id: imageId,
          },
          {
            headers: {
              "x-api-key": API_KEY,
            },
          }
        );
        console.log(`Image ${imageId} added to favourites`);
        return true; // Favourited
      }
    } catch (error) {
      console.error("Error toggling favourite status:", error);
    }
  }

  async function initialLoad() {
    try {
      const response = await axios.get("https://api.thecatapi.com/v1/breeds", {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        onDownloadProgress: updateProgress,
      });

      const breeds = response.data;
      breeds.forEach((breed) => {
        const option = document.createElement("option");
        option.value = breed.id;
        option.textContent = breed.name;
        breedSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading breeds:", error);
    }
  }

  async function onBreedSelectChange() {
    const selectedBreedId = breedSelect.value;
    infoDump.innerHTML = "";

    try {
      const response = await axios.get(
        `https://api.thecatapi.com/v1/images/search`,
        {
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
          },
          params: {
            breed_ids: selectedBreedId,
            limit: 5,
          },
          onDownloadProgress: updateProgress,
        }
      );

      const breedImages = response.data;

      // Clear existing carousel content before appending new images
      Carousel.clear();

      // Add each image to the carousel
      breedImages.forEach((imageObj) => {
        const carouselItem = Carousel.createCarouselItem(
          imageObj.url,
          "Breed Image",
          imageObj.id
        );
        Carousel.appendCarousel(carouselItem);
      });

      const breedInfo = breedImages[0].breeds[0];
      const breedInfoSection = document.createElement("div");
      breedInfoSection.className = "breed-info";

      breedInfoSection.innerHTML = `
        <h2>${breedInfo.name}</h2>
        <p><strong>Origin:</strong> ${breedInfo.origin}</p>
        <p><strong>Temperament:</strong> ${breedInfo.temperament}</p>
        <p><strong>Life Span:</strong> ${breedInfo.life_span} years</p>
        <p><strong>Description:</strong> ${breedInfo.description}</p>
      `;

      infoDump.appendChild(breedInfoSection);
    } catch (error) {
      console.error("Error loading breed information:", error);
    }
  }

  // Add event listener to the breed selection dropdown
  breedSelect.addEventListener("change", onBreedSelectChange);

  // Load carousel and info for the first breed in the dropdown by triggering the change event after initial load
  initialLoad().then(() => {
    breedSelect.dispatchEvent(new Event("change"));
  });
});
