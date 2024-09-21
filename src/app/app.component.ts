import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { take } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    FormsModule,
    HttpClientModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  generatedDescription = signal<string | undefined>(undefined);
  videoUrl = signal<string | undefined>(undefined);
  error = signal<string | undefined>(undefined);
  isLoading = signal<boolean | undefined>(undefined);
  #genAI: GoogleGenerativeAI | undefined;
  #youtubeApiKey: string | undefined = import.meta.env.NG_APP_YOUTUBE_API_KEY;
  #geminiApiKey: string | undefined = import.meta.env.NG_APP_GEMINI_API_KEY;
  #http = inject(HttpClient);

  ngOnInit() {
    this.#genAI = new GoogleGenerativeAI(this.#geminiApiKey!);
  }

  getVideoDetails(videoUrl: string | undefined): void {
    this.error.set(undefined);
    const videoId = this.extractVideoId(videoUrl!);
    if (!videoId) {
      this.error.set('Invalid YouTube URL');
      return;
    }
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${
      this.#youtubeApiKey
    }`;
    this.isLoading.set(true);
    this.#http
      .get(url)
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          const videoData = response.items[0];
          this.generateDescription(
            videoData.snippet.title,
            videoData.snippet.description
          );
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Error fetching video details:', error);
        },
      });
  }

  private generateDescription(
    title: string,
    originalDescription: string
  ): void {
    const prompt = {
      input: `Generate a description for a YouTube video with the title: "${title}" and the following description: "${originalDescription}"`,
    };
    this.#genAI
      ?.getGenerativeModel({ model: 'gemini-pro' })
      .generateContent(prompt.input)
      .then((response: any) => {
        this.generatedDescription.set(
          response.response.candidates[0].content.parts[0]?.text
        );
        this.isLoading.set(false);
      })
      .catch((error: any) => {
        this.error = error;
        this.isLoading.set(false);
      });
  }

  private extractVideoId(url: string): string | null {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}
