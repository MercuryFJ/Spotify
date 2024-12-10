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
const nextSongButton = document.getElementById('next-song-button');
const previousSongButton = document.getElementById('previous-song-button');
const loopButton = document.getElementById('loop-button');
const shuffleButton = document.getElementById('shuffle-button');
const volumeRange = document.getElementById("volume");
const volumenContainer = document.querySelector(".volume-controls");
const favsButton = document.getElementById("favs-button");
const allSongsButton = document.getElementById("all-button");
const closeFormButton = document.getElementById("close-button");
const modalErrorMsg = document.querySelectorAll('.error-message');
const errorTitleMsg = document.getElementById('error-title');
const errorArtistMsg = document.getElementById('error-artist');
const errorCoverMsg = document.getElementById('error-cover');
const errorFileMsg = document.getElementById('error-file');

// API 
const API = "http://informatica.iesalbarregas.com:7007";
const songsEndPoint = API + "/songs"; // EndPoint para recoger las canciones de la API
const uploadEndPoint = API + "/upload"; // EndPoint para cargar las canciones en la API

// Options for the fetch request
const options = {
  method: 'GET'
};

// Variables
let currentSong = null; // Canción actual
let currentSongItem = null; // Variable global para almacenar el elemento de la canción actual
let currentAudio = null; // Variable para saber si se está reproduciendo un audio
let isPlaying = false; // Estado de reproducción
let songsList = []; // Almacena todas las canciones de la API
let currentSongIndex = 0; // Índice de la canción actual
let isLooping = false; // Estado inicial del bucle (desactivado)
let isShuffle = false; // Estado inicial del modo aleatorio (desactivado)
let favorites = JSON.parse(localStorage.getItem('favorites')) || []; // Array de canciones favoritas

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
    // Carga la lista de canciones y las muestra en el DOM
    songs.forEach(song => {
      const songItem = createSongItem(song);
      songsContainer.appendChild(songItem);
    });

    nextSongButton.addEventListener('click', playNextSong); // Controla el evento de pasar a la siguiente canción
    previousSongButton.addEventListener('click', playPreviousSong); // Controla el evento de volver a la canción anterior
    loopButton.addEventListener('click', toggleLoop); // Controla el evento de repetir la canción en reproducción
    shuffleButton.addEventListener('click', toggleShuffle); // Controla el evento de la escucha de manera aleatoria

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
  // Añadimos al DOM el contenedor de la canción
  const songItem = document.createElement('div');
  songItem.classList.add('song-item');

  // Añadimos al DOM el icono de play de la canción
  const playSongButton = document.createElement('span');
  playSongButton.classList.add("play-song-button");
  playSongButton.innerHTML = `<i class="bx bx-play play-icon"></i>`;

  // Añadimos al DOM el título de la canción
  const title = document.createElement('span');
  title.textContent = song.title;

  // Añadimos al DOM el artista de la canción
  const artist = document.createElement('span');
  artist.textContent = song.artist;

  // Añadimos al DOM la duración de la canción
  const duration = document.createElement('span');
  const audio = new Audio(song.filepath);
  audio.addEventListener('loadedmetadata', () => {
    const minutes = Math.floor(audio.duration / 60);
    const seconds = Math.floor(audio.duration % 60).toString().padStart(2, '0');
    duration.textContent = `${minutes}:${seconds}`;
  });

  // Añadimos al DOM el botón de favoritos
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
    if (favButton.firstChild.classList.contains("bx-heart")) { //El primer hijo es la etiqueta <i>
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

  // Manejar el evento de clic en el item de la canción
  songItem.addEventListener('click', () => {
    selectSong(song);
  });

  return songItem;
}

// Función para seleccionar una canción
function selectSong(song) {
  // Comprobar si estamos en la vista de favoritos
  if (songsContainer.classList.contains('favorites-view')) {
    // Si la canción no está en favoritos, no se puede reproducir
    if (!favorites.some(fav => fav.filepath === song.filepath)) {
      return; // No hacer nada si no está en favoritos
    }
  }

  // Actualizar el indice del array de canciones según la lista que estemos visualizando.
  if (songsContainer.classList.contains('favorites-view')) {
    currentSongIndex = favorites.findIndex(s => s.filepath === song.filepath);
  } else {
    currentSongIndex = songsList.findIndex(s => s.filepath === song.filepath);
  }

  // Si hay un audio en reproducción, lo pausa y lo reinicia
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
    <div class="song-name"><span>${song.title}</span></div>
    <div class="artist-name"><span>${song.artist}</span></div>
  `;

  // Restablecer el estado de reproducción
  isPlaying = false;
  updatePlayPauseButton(false);

  // Quita la clase active de cualquier otra canción para que no haya dos marcadas a la vez
  const activeSongs = document.querySelectorAll('.song-item-active');
  activeSongs.forEach(song => song.classList.remove('song-item-active'));

  //Permite que la canción seleccionada esté marcada mientras se reproduce
  currentSongItem = document.querySelector(`.song-item:nth-child(${currentSongIndex + 1})`);
  playSong(song.filepath);
}

// Función que alterna entre el Play y el Pause 
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

// Reproduce la canción que corresponda según la situación en la que se encuentre el reproductor
function playSong(songUrl) {
  // Para la canción actual en reproducción para poder reproducir la siguiente y que no se solapen
  if (currentAudio) {
    currentAudio.pause();
  }
  currentAudio = new Audio(songUrl);

  // Establecer la duración total en el elemento totalTime
  currentAudio.addEventListener('loadedmetadata', () => {
    totalTime.textContent = formatTime(currentAudio.duration);
  });

  // Reproduce la canción al volumen adecuado
  currentAudio.play();
  currentAudio.volume = volumeRange.value;
  isPlaying = true;
  updatePlayPauseButton(true);

  // Agregar un event listener para cuando la canción termine
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

  // Este evento actualiza el valor de la progress bar según la duración de la canción
  currentAudio.addEventListener('timeupdate', () => {
    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    // Controlamos en caso de que la duración no se haya cargado.
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

// Esta función actualiza el contenido de los iconos de reproducción
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
  // Se obtiene la posición y tamaño del elemento progressBar en la ventana del navegador.
  const rect = progressBar.getBoundingClientRect();
  // Se calcula la posición X del clic del ratón en relación con el inicio de la barra de progreso.
  const clickX = e.clientX - rect.left;
  // Se calcula el porcentaje de progreso que representa la posición del clic en la barra.
  const progress = (clickX / rect.width) * 100;
  progressBar.value = progress;
  updateCurrentTime(progress);

  if (currentAudio != null) {
    // Se actualiza el tiempo actual de reproducción del audio
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

  // Se elimina el event listener de mousemove para que la barra de progreso deje de actualizarse cuando el usuario deja de arrastrar el ratón.
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

// Evento que permite mostrar el modal
addQueueButton.addEventListener('click', () => {
  modalContainer.classList.replace("hidden", "modal-container");
  modalErrorMsg.forEach(span => span.textContent = '');
})

// Este evento controla si el usuario pulsa fuera de la pantalla, al estar desplegado el modal, este se cierra.
window.onclick = function (event) {
  if (event.target == modalContainer) {
    modalContainer.classList.replace("modal-container", "hidden");
    closeModal();
  }
}

closeFormButton.addEventListener('click', () => {
  closeModal();
})

// Función para cerrar el modal
function closeModal() {
  modalContainer.classList.add('hidden');
  clearForm();
}

// Función para limpiar el formulario en caso de añadir o no una canción
function clearForm() {
  addQueueForm.reset();
  modalErrorMsg.forEach(span => span.textContent = '');
}

// Manejar el evento de envío del formulario
addQueueForm.addEventListener("submit", function (e) {
  e.preventDefault(); // Evitar la recarga de la página al enviar el formulario

  // Validaciones de los campos del formulario
  const title = document.getElementById('song-title');
  const artist = document.getElementById('song-artist');
  const file = document.getElementById('song-file');
  const cover = document.getElementById('song-image');
  let isValid = true;

  // Permite que se visualice el nombre del archivo al subirlo
  file.addEventListener('change', () => {
    file.style.color = "black";
  })

  const regex = /^[A-Za-z\s]{1,20}$/;

  // Limpiar mensajes de error
  modalErrorMsg.forEach(span => span.textContent = '');

  // Valida si se cumple el regex en el titulo de la canción
  if (!regex.test(title.value)) {
    isValid = false;
    errorTitleMsg.textContent = 'El campo está vacío o contiene caracteres no válidos.';
  }

  // Valida si se cumple el regex en el artista de la canción
  if (!regex.test(artist.value)) {
    isValid = false;
    errorArtistMsg.textContent = 'El campo está vacío o contiene caracteres no válidos.';
  }

  // Controla si se ha subido el archivo de la canción
  if (!file.files.length) {
    isValid = false;
    errorFileMsg.textContent = 'Debes seleccionar un archivo de audio.';
  }

  // Controla si se ha subido la imagen de la canción
  if (!cover.files.length) {
    isValid = false;
    errorCoverMsg.textContent = 'Debes seleccionar una portada.';
  }

  // Si alguno de los campos no fuera válido no se efectuaría el POST
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
      // Actualizar el arreglo de canciones en memoria
      songsList.push(data);
      // Crear un nuevo elemento de canción y añadirlo al DOM
      const newSongItem = createSongItem(data.result);
      songsContainer.appendChild(newSongItem);
      closeModal()
    })
    .catch(error => {
      console.error(error.message);
      alert("Hubo un error al subir la canción. Inténtalo de nuevo.");
    });
});

// Este evento controla el icono del volumen según el valor del type range
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

// Permite que se visualice el valor del volumen en la barra del input type=range
volumeRange.addEventListener('input', function () {
  const value = (this.value - this.min) / (this.max - this.min) * 100;
  this.style.setProperty('--range-progress', `${value}%`);
});

// Reproduce la siguiente canción en caso de seleccionar el icono de next-song
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

// Reproduce la canción anterior en caso de seleccionar el icono de previous-song
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

// Reproduce una canción aleatoria en caso de estar en la vista de favoritos y estar activado el modo aleatorio
function playRandomFavSong() {
  if (!favorites.length) return; // Si no hay favoritos, salir

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * favorites.length);
  } while (favorites[randomIndex].filepath === currentSong.filepath);

  const randomSong = favorites[randomIndex];
  selectSong(randomSong);
}

// Reproduce una canción aleatoria en caso de estar en la vista de todas las canciones y estar activado el modo aleatorio
function playRandomSong() {
  if (!songsList.length) return; // Si no hay canciones, salir

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * songsList.length); // Genera un índice aleatorio
  } while (songsList[randomIndex].filepath === currentSong.filepath); // Verifica que no sea la misma canción

  const randomSong = songsList[randomIndex];
  selectSong(randomSong); // Reproduce la canción aleatoria
}

// Alterna el estado del icono escuchar una canción en bucle
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

// Alterna el estado del icono al usar el modo aleatorio
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

// Evento que detecta si se ha pulsado el botón de favoritos
favsButton.addEventListener("click", () => {
  loadFavorites();
});

// Función que carga las canciones favoritas en la lista de favoritos y en el DOM
function loadFavorites() {
  // Limpiar el contenedor antes de cargar
  songsContainer.innerHTML = "";

  // Añadir una clase especial al contenedor para identificar la vista de favoritos
  songsContainer.classList.add('favorites-view');

  // Cargar favoritos desde LocalStorage
  favorites = JSON.parse(localStorage.getItem('favorites')) || []; // Aseguramos que favorites esté actualizado

  // Comprobar si existen canciones favoritas
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

// Evento que controla la selección del botón "Todos" en el filtro
allSongsButton.addEventListener('click', () => {
  loadAllSongs();
})

// Carga todas las canciones en caso de seleccionar "Todos" en el filtro
function loadAllSongs() {
  songsContainer.innerHTML = ""; // Limpia el contenedor
  if(songsContainer.classList.contains('favorites-view')){
    songsContainer.classList.remove('favorites-view'); // Elimina la clase de favoritos
  }

  // Carga todas las canciones en el DOM
  songsList.forEach(song => {
    const songItem = createSongItem(song);
    songsContainer.appendChild(songItem);
  });
}

