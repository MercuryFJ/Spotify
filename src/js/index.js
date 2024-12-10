// Selecting DOM elements
const songList = document.querySelector('.main-content');
const currentMusic = document.querySelector('.currentMusic');
const playButton = document.querySelector('.play-button');
const pauseTopButton = document.querySelector('.user-controls button');
const progressBar = document.querySelector('.progress-bar');
const currentTime = document.querySelector('.time.current');
const totalTime = document.querySelector('.time.total');
const modalContainer = document.getElementById('modal-container');
const addQueueButton = document.getElementById('add-to-queue');
const addQueueForm = document.getElementById('add-to-queue-form');
const uploadButton = document.getElementById("upload-button");
const songsContainer = document.getElementById('songs-container');
const loopButtonIcon = document.querySelector('#loop-button i');
const shuffleButtonIcon = document.querySelector('#shuffle-button i');

// Songs API endpoint
const API = "http://informatica.iesalbarregas.com:7007";
const songsEndPoint = API + "/songs";
const uploadEndPoint = API + "/upload";

// Options for the fetch request
const options = {
  method: 'GET'
};

// State variables
let currentSong = null;
let currentAudio = null;
let isPlaying = false;
let songsList = []; // Almacena todas las canciones de la API
let currentSongIndex = 0; // Índice de la canción actual
let isLooping = false; // Estado inicial del bucle (desactivado)
let isShuffle = false; // Estado inicial del modo aleatorio (desactivado)
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Fetch songs
// Hacemos el GET de la API, sacamos los datos con el fetch
fetch(songsEndPoint, options)
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`Network error: ${response.status}`);
    }
  })
  .then(songs => {
    songsList = songs;
    // Populate song list
    songs.forEach(song => {
      const songItem = createSongItem(song);
      songsContainer.appendChild(songItem);
    });

    document.getElementById('next-song-button').addEventListener('click', playNextSong);
    document.getElementById('previous-song-button').addEventListener('click', playPreviousSong);
    document.getElementById('loop-button').addEventListener('click', toggleLoop);
    document.getElementById('shuffle-button').addEventListener('click', toggleShuffle);

    // Play button event listener
    playButton.addEventListener('click', () => {
      if (currentSong) {
        togglePlayPause();
      }
    });

    // Pause top button event listener
    pauseTopButton.addEventListener('click', () => {
      if (currentSong) {
        togglePlayPause();
      }
    });
  })
  .catch(error => {
    console.error('Error fetching songs:', error.message);
  });

function createSongItem(song) {
  const songItem = document.createElement('div');
  songItem.classList.add('song-item');

  const playSongButton = document.createElement('span');
  playSongButton.classList.add("play-song-button");
  playSongButton.innerHTML = `<i class="bx bx-play play-icon"></i>`;
  //playSongButton.firstElementChild.style.display = "none";

  const title = document.createElement('span');
  title.textContent = song.title;

  const artist = document.createElement('span');
  artist.textContent = song.artist;

  const duration = document.createElement('span');
  const audio = new Audio(song.filepath);
  audio.addEventListener('loadedmetadata', () => {
    const minutes = Math.floor(audio.duration / 60);
    const seconds = Math.floor(audio.duration % 60).toString().padStart(2, '0');
    duration.textContent = `${minutes}:${seconds}`;
  });

  const favButton = document.createElement('button');
  favButton.classList.add("fav-button");
  // Verificar si la canción ya es favorita al cargar
  if (favorites.some(fav => fav.filepath === song.filepath)) {
    favButton.innerHTML = `<i class='bx bxs-heart'></i>`; // Corazón lleno si ya es favorita
  } else {
    favButton.innerHTML = `<i class='bx bx-heart'></i>`; // Corazón vacío
  }

  songItem.append(playSongButton, title, artist, duration, favButton);
  songsContainer.append(songItem);

  // Manejo del botón de favoritos
  favButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (favButton.firstChild.classList.contains("bx-heart")) {
      // Si no es favorita, añadir a favoritos
      favButton.innerHTML = `<i class='bx bxs-heart'></i>`;
      favorites.push(song); // Añadir la canción a la lista de favoritos
      localStorage.setItem('favorites', JSON.stringify(favorites)); // Guardar en LocalStorage
    } else {
      // Si ya es favorita, quitarla de favoritos
      favButton.innerHTML = `<i class='bx bx-heart'></i>`;
      favorites = favorites.filter(fav => fav.filepath !== song.filepath); // Eliminar de la lista
      localStorage.setItem('favorites', JSON.stringify(favorites)); // Actualizar LocalStorage

      // Si se está mostrando la lista de favoritos, quitarla de la vista actual
      if (songsContainer.classList.contains('favorites-view')) {
        const songItem = favButton.parentElement; // Obtén el contenedor de la canción
        songsContainer.removeChild(songItem); // Elimina la canción del DOM

        // Si no quedan canciones favoritas, muestra el mensaje de "sin favoritos"
        if (favorites.length === 0) {
          songsContainer.innerHTML = "<p>No tienes canciones favoritas.</p>";
        }
      }
    }
  });

  songItem.addEventListener('click', () => {
    console.log(songItem)
    selectSong(song);
  });

  return songItem;
}

let currentSongItem = null; // Variable global para almacenar el elemento de la canción actual

function selectSong(song) {
  // Comprobar si estamos en la vista de favoritos
  if (songsContainer.classList.contains('favorites-view')) {
    // Si la canción no está en favoritos, no se puede reproducir
    if (!favorites.some(fav => fav.filepath === song.filepath)) {
      return; // No hacer nada si no está en favoritos
    }
  }

  // Actualizar currentSongIndex según la vista actual
  if (songsContainer.classList.contains('favorites-view')) {
    currentSongIndex = favorites.findIndex(s => s.filepath === song.filepath);
  } else {
    currentSongIndex = songsList.findIndex(s => s.filepath === song.filepath);
  }

  // Si hay un audio en reproducción, pausarlo y reiniciarlo
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  // Establecer la nueva canción como actual
  currentSong = song;
  currentMusic.innerHTML = `
    <div class="song-info">
      <img id="coverInfo" src="${song.cover}" alt="${song.title}">
    </div>
  `;
  const musicData = document.querySelector('#music-data');
  musicData.innerHTML = `
    <div class="song-name">${song.title}</div>
    <div class="artist-name">${song.artist}</div>
  `;

  // Restablecer el estado de reproducción
  isPlaying = false;
  updatePlayPauseButton(false);

  // Quitar la clase active de cualquier otra canción
  const activeSongs = document.querySelectorAll('.song-item-active');
  activeSongs.forEach(song => song.classList.remove('song-item-active'));

  currentSongItem = document.querySelector(`.song-item:nth-child(${currentSongIndex + 1})`);
  playSong(song.filepath);
}

function togglePlayPause() {
  if (!currentSong) return;

  if (!currentAudio || currentAudio.src !== currentSong.filepath) {
    // If no audio is loaded or a new song is selected, create and play a new Audio
    playSong(currentSong);
  } else if (isPlaying) {
    // If currently playing, pause the song
    currentAudio.pause();
    isPlaying = false;
    updatePlayPauseButton(false);
  } else {
    // If paused, resume playing
    currentAudio.play();
    isPlaying = true;
    updatePlayPauseButton(true);
  }
}

function playSong(songUrl) {
  if (currentAudio) {
    currentAudio.pause();
  }
  currentAudio = new Audio(songUrl);

  // Establecer la duración total en el elemento totalTime
  currentAudio.addEventListener('loadedmetadata', () => {
    totalTime.textContent = formatTime(currentAudio.duration);
  });

  currentAudio.play();
  currentAudio.volume = volumeRange.value;
  isPlaying = true;
  updatePlayPauseButton(true);

  // Add event listener to handle when song ends
  currentAudio.addEventListener('ended', () => {
    if (isLooping) {
      currentAudio.currentTime = 0; // Reinicia la canción actual
      currentAudio.play();
    } else if (isShuffle) {
      playNextSong(); // Reproduce una canción aleatoria
    } else {
      playNextSong(); // Reproduce la siguiente canción
    }
  });

  currentAudio.addEventListener('timeupdate', () => {
    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    if (!Number.isNaN(progress)) {
      progressBar.value = progress;
    }
    // Eliminar o comentar la actualización del tiempo actual
    currentTime.textContent = formatTime(currentAudio.currentTime);
  });

  // Agregar la clase active al elemento de la canción actual (si existe)
  if (currentSongItem) {
    currentSongItem.classList.add('song-item-active');

    // Agregar un event listener para cuando la canción termine
    currentAudio.addEventListener('ended', () => {
      // Quitar la clase active cuando la canción termine
      if (currentSongItem) {
        currentSongItem.classList.remove('song-item-active');
      }
    });
  }
}

function updatePlayPauseButton(playing) {
  const playButtonIcon = playButton.querySelector('i');
  if (playing) {
    pauseTopButton.textContent = "PAUSE";
    playButtonIcon.classList.remove('bx-play-circle');
    playButtonIcon.classList.add('bx-pause-circle');
  } else {
    pauseTopButton.textContent = "PLAY";
    playButtonIcon.classList.remove('bx-pause-circle');
    playButtonIcon.classList.add('bx-play-circle');
  }
}

// Función para formatear el tiempo en minutos y segundos
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

// Event listener para la barra de progreso
progressBar.addEventListener('mousedown', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const progress = (clickX / rect.width) * 100;
  progressBar.value = progress;
  updateCurrentTime(progress);

  if (currentAudio != null) {
    // Mover la canción a la nueva posición
    currentAudio.currentTime = (progress / 100) * currentAudio.duration;
  }
  // Event listener para cuando se mueve el ratón mientras se mantiene presionado el botón
  const handleMouseMove = (e) => {
    const clickX = e.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    progressBar.value = progress;
    updateCurrentTime(progress);
    if (currentAudio != null) {
      currentAudio.currentTime = (progress / 100) * currentAudio.duration;
    }
  }

  window.addEventListener('mousemove', handleMouseMove);

  // Event listener para cuando se suelta el botón del ratón
  window.addEventListener('mouseup', () => {
    window.removeEventListener('mousemove', handleMouseMove);
  });
});

// Función para actualizar el tiempo actual en el elemento currentTime
function updateCurrentTime(progress) {
  if (currentAudio != null) {
    const newTime = (progress / 100) * currentAudio.duration;
    currentTime.textContent = formatTime(newTime);
  }
}

addQueueButton.addEventListener('click', () => {
  modalContainer.classList.replace("hidden", "modal-container");
  document.querySelectorAll('.error-message').forEach(span => span.textContent = '');
})

window.onclick = function (event) {
  if (event.target == modalContainer) {
    modalContainer.classList.replace("modal-container", "hidden");
    closeModal();
  }
}

const closeFormButton = document.getElementById("close-button");
closeFormButton.addEventListener('click', () => {
  closeModal();
})

// Función para cerrar el modal
function closeModal() {
  document.querySelectorAll('.error-message').forEach(span => span.textContent = '');
  modalContainer.classList.add('hidden');
  clearForm();
}

function clearForm() {
  addQueueForm.reset();
  document.querySelectorAll('.error-message').forEach(span => span.textContent = '');
}

// Manejar el evento de envío del formulario
addQueueForm.addEventListener("submit", function (e) {
  e.preventDefault(); // Evitar la recarga de la página al enviar el formulario

  // Validaciones
  const title = document.getElementById('song-title');
  const artist = document.getElementById('song-artist');
  const file = document.getElementById('song-file');
  const cover = document.getElementById('song-image');
  let isValid = true;

  file.addEventListener('change', () => {
    file.style.color = "black";
  })

  const regex = /^[A-Za-z\s]{1,20}$/;

  // Limpiar mensajes de error
  document.querySelectorAll('.error-message').forEach(span => span.textContent = '');

  if (!regex.test(title.value)) {
    isValid = false;
    document.getElementById('error-title').textContent = 'El campo está vacío o contiene caracteres no válidos.';
  }

  if (!regex.test(artist.value)) {
    isValid = false;
    document.getElementById('error-artist').textContent = 'El campo está vacío o contiene caracteres no válidos.';
  }

  if (!file.files.length) {
    isValid = false;
    document.getElementById('error-file').textContent = 'Debes seleccionar un archivo de audio.';
  }

  if (!cover.files.length) {
    isValid = false;
    document.getElementById('error-cover').textContent = 'Debes seleccionar una portada.';
  }

  if (!isValid) return;

  // Crear un objeto FormData para capturar los datos del formulario
  const formData = new FormData(addQueueForm);

  // Enviar los datos al servidor mediante fetch
  fetch(uploadEndPoint, {
    method: "POST",
    body: formData,
    headers: {
      "Accept": "application/json",
    },
  })
    .then(response => {
      if (response.ok) {
        return response.json(); // Procesar respuesta en JSON si es exitoso
      } else {
        throw new Error(`Error al subir música: ${response.status}`);
      }
    })
    .then(data => {
      console.log("Música subida con éxito:", data);

      addQueueForm.reset();
      document.querySelectorAll('.error-message').forEach(span => span.textContent = '');
      // Cerrar el modal
      modalContainer.classList.replace("modal-container", "hidden");

      // Actualizar el arreglo de canciones en memoria
      songsList.push(data);

      // Crear un nuevo elemento de canción y añadirlo al DOM
      const newSongItem = createSongItem(data.result);
      songsContainer.appendChild(newSongItem);
    })
    .catch(error => {
      console.error(error.message);
      alert("Hubo un error al subir la canción. Inténtalo de nuevo.");
    });
});

const volumeRange = document.getElementById("volume");
const volumenContainer = document.querySelector(".volume-controls");
volumeRange.addEventListener('input', (e) => {
  if (currentAudio != null) {
    currentAudio.volume = e.target.value;
  }

  // Cambia el icono según el valor del volumen
  if (e.target.value == 0) {
    // Si el volumen es 0, mostramos el icono de mute
    volumenContainer.firstElementChild.className = "";
    volumenContainer.firstElementChild.classList.add("bx", "bxs-volume-mute");
  } else if (e.target.value <= 0.50) {
    // Si el volumen es alto (0.50 o más), mostramos el icono de volumen completo
    volumenContainer.firstElementChild.className = "";
    volumenContainer.firstElementChild.classList.add("bx", "bxs-volume-low");
  } else {
    // Para otros valores, podemos mantener el icono de volumen medio (opcional)
    volumenContainer.firstElementChild.className = "";
    volumenContainer.firstElementChild.classList.add("bx", "bxs-volume-full");
  }
})

volumeRange.addEventListener('input', function () {
  const value = (this.value - this.min) / (this.max - this.min) * 100;
  this.style.setProperty('--range-progress', `${value}%`);
});

function playNextSong() {
  if (isLooping) {
    // Si está activo el loop, reinicia la canción actual y no cambia
    currentAudio.currentTime = 0;
    currentAudio.play();
    return;
  }

  if (songsContainer.classList.contains('favorites-view')) {
    // Si estamos en la vista de favoritos
    if (isShuffle) {
      // Si shuffle está activo, reproduce una canción aleatoria de favoritos
      playRandomFavSong();
    } else {
      // Si no, reproduce la siguiente canción de favoritos
      currentSongIndex = (currentSongIndex + 1) % favorites.length;
      selectSong(favorites[currentSongIndex]);
    }
  } else {
    // Si no estamos en la vista de favoritos, funciona como antes
    if (isShuffle) {
      playRandomSong();
    } else {
      currentSongIndex = (currentSongIndex + 1) % songsList.length;
      selectSong(songsList[currentSongIndex]);
    }
  }
}
function playPreviousSong() {
  if (isLooping) {
    // Si está activo el loop, reinicia la canción actual y no cambia
    currentAudio.currentTime = 0;
    currentAudio.play();
    return;
  }

  if (songsContainer.classList.contains('favorites-view')) {
    // Si estamos en la vista de favoritos
    if (isShuffle) {
      // Si shuffle está activo, reproduce una canción aleatoria de favoritos
      playRandomFavSong();
    } else {
      // Si no, reproduce la canción anterior de favoritos
      currentSongIndex = (currentSongIndex - 1 + favorites.length) % favorites.length;
      selectSong(favorites[currentSongIndex]);
    }
  } else {
    // Si no estamos en la vista de favoritos, funciona como antes
    if (isShuffle) {
      playRandomSong();
    } else {
      currentSongIndex = (currentSongIndex - 1 + songsList.length) % songsList.length;
      selectSong(songsList[currentSongIndex]);
    }
  }
}

function playRandomFavSong() {
  if (!favorites.length) return; // Si no hay favoritos, salir

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * favorites.length);
  } while (favorites[randomIndex].filepath === currentSong.filepath);

  const randomSong = favorites[randomIndex];
  selectSong(randomSong);
}

function toggleLoop() {
  isLooping = !isLooping; // Alterna el estado

  // Cambiar el ícono o estilo del botón según el estado del bucle
  if (isLooping) {
    loopButtonIcon.classList.add('active'); // Clase CSS opcional para indicar activación
    loopButtonIcon.style.color = 'var(--color-primary)'; // Ejemplo de cambio visual
    if (isShuffle) {
      isShuffle = false; // Desactiva el estado de shuffle
      const shuffleButtonIcon = document.querySelector('#shuffle-button i');
      shuffleButtonIcon.classList.remove('active');
      shuffleButtonIcon.style.color = ''; // Restaurar estilo del botón shuffle
    }
  } else {
    loopButtonIcon.classList.remove('active');
    loopButtonIcon.style.color = ''; // Restaurar color original
  }
}

function toggleShuffle() {
  isShuffle = !isShuffle; // Alterna el estado

  // Cambiar el estilo del botón según el estado
  if (isShuffle) {
    shuffleButtonIcon.classList.add('active');
    shuffleButtonIcon.style.color = 'var(--color-primary)'; // Cambio visual al activar
    // Desactivar el loop si estaba activo
    if (isLooping) {
      isLooping = false; // Desactiva el estado de loop
      const loopButtonIcon = document.querySelector('#loop-button i');
      loopButtonIcon.classList.remove('active');
      loopButtonIcon.style.color = ''; // Restaurar estilo del botón loop
    }
  } else {
    shuffleButtonIcon.classList.remove('active');
    shuffleButtonIcon.style.color = ''; // Restaurar estilo original
  }
}

function playRandomSong() {
  if (!songsList.length) return; // Si no hay canciones, salir

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * songsList.length); // Genera un índice aleatorio
  } while (songsList[randomIndex].filepath === currentSong.filepath); // Verifica que no sea la misma canción

  const randomSong = songsList[randomIndex];
  selectSong(randomSong); // Reproduce la canción aleatoria
}

const favsButton = document.getElementById("favs-button");

favsButton.addEventListener("click", () => {
  loadFavorites();
});

function loadFavorites() {
  // Limpiar el contenedor antes de cargar
  songsContainer.innerHTML = "";

  // Añadir una clase especial al contenedor para identificar la vista de favoritos
  songsContainer.classList.add('favorites-view');

  // Cargar favoritos desde LocalStorage
  favorites = JSON.parse(localStorage.getItem('favorites')) || []; // Aseguramos que favorites esté actualizado

  if (favorites.length === 0) {
    songsContainer.innerHTML = "<p>No tienes canciones favoritas.</p>";
    return;
  }

  // Crear un item para cada canción favorita
  favorites.forEach(song => {
    const songItem = createSongItem(song);
    songsContainer.appendChild(songItem);
  });
}

const allSongsButton = document.getElementById("all-button");
allSongsButton.addEventListener('click', () => {
  loadAllSongs();
})

function loadAllSongs() {
  songsContainer.innerHTML = ""; // Limpia el contenedor
  songsContainer.classList.remove('favorites-view'); // Elimina la clase de favoritos

  songsList.forEach(song => {
    const songItem = createSongItem(song);
    songsContainer.appendChild(songItem);
  });
}

