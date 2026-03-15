package uz.garantbank.okrTrackingSystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OkrTrackingSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(OkrTrackingSystemApplication.class, args);
	}

}
